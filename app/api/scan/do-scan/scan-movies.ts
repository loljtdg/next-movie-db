import fs from 'fs';
import path from 'path';
import { FileInfo, ScanResult } from './types';
import { getInfoFromName } from './get-info-from-name';
import { Database } from '../../db/db';
import dayjs from 'dayjs';
import { checkSignal } from './check-signal';
import { scanLogger } from './log';
import { SCAN_BLACK_PATH_LIST } from '../../constants';

const VIDEO_EXTENSIONS = [
  '.mp4',
  '.avi',
  '.mkv',
  '.wmv',
  '.flv',
  '.mov',
  '.mpg',
  '.mpeg',
  '.ts',
  '.webm',
  '.ogv',
  '.3gp',
  '.m4v',
  '.asf',
  '.rm',
  '.rmvb',
  '.divx',
  '.xvid',
  '.f4v',
  '.mxf',
  '.r3d',
  '.braw',
];

export class MoviesScanner {
  private signal: AbortSignal;
  private db: Database;

  constructor(signal: AbortSignal, db: Database) {
    this.signal = signal;
    this.db = db;
  }

  private async scanDirectory(dirPaths: string[]): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    const scan = async (dir: string): Promise<void> => {
      try {
        const items = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dir, item.name);

          // 如果文件/目录路径命中黑名单，跳过
          if (
            SCAN_BLACK_PATH_LIST.some((blackItem) => fullPath.includes(blackItem))
          ) {
            continue;
          }

          if (item.isDirectory()) {
            await scan(fullPath);
          } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (VIDEO_EXTENSIONS.includes(ext)) {
              // 获取文件统计信息
              const stats = await fs.promises.stat(fullPath);

              files.push({
                path: fullPath,
                name: item.name,
                file_added_date: Math.max(
                  stats.birthtime.getTime(),
                  stats.mtime.getTime(),
                ),
                size: stats.size,
              });
            }
          }
        }
      } catch (error) {
        scanLogger.error(`Error scanning directory ${dir}:`, error);
        // 可以选择抛出错误或继续处理其他文件
        // throw error;
      }
    };

    for (const dirPath of dirPaths) {
      // 可选：检查目录是否存在，避免不必要的报错，或者直接让 scan 内部的 catch 处理
      try {
        const stat = await fs.promises.stat(dirPath);
        if (stat.isDirectory()) {
          await scan(dirPath);
        } else {
          scanLogger.warn(`Path is not a directory: ${dirPath}`);
        }
      } catch (e) {
        scanLogger.error(`Invalid directory path: ${dirPath}`, e);
      }
    }
    return files;
  }

  private filterMovies(fileInfos: FileInfo[]) {
    const success: ScanResult[] = [];
    const failed: FileInfo[] = [];
    fileInfos.forEach((info) => {
      const fileNameInfo = getInfoFromName(info.name);
      if (!fileNameInfo) {
        failed.push(info);
      } else {
        success.push({
          ...info,
          ...fileNameInfo,
        });
      }
    });
    return { success, failed };
  }

  private translate2IDs(scanResult: ScanResult) {
    const actorIds: string[] = [];
    for (const actorName of scanResult.actor_names) {
      let actor = this.db.getActorByName(actorName);
      if (!actor) {
        // 如果演员不存在，可以创建一个新的
        actor = {
          id: `actor_${crypto.randomUUID()}`, // 简单的 ID 生成方式
          name: actorName,
          aliases: [],
          created_at: dayjs().valueOf(),
          updated_at: dayjs().valueOf(),
        };
        this.db.addActor(actor);
      }
      actorIds.push(actor.id);
    }

    const tagIds: string[] = [];
    for (const tagName of scanResult.tag_names) {
      let tag = this.db.getTagByName(tagName);
      if (!tag) {
        // 如果标签不存在，可以创建一个新的
        tag = {
          id: `tag_${crypto.randomUUID()}`, // 简单的 ID 生成方式
          name: tagName,
          is_main: true, // 从文件名解析的标签都是主要标签
          aliases: [],
          created_at: dayjs().valueOf(),
          updated_at: dayjs().valueOf(),
        };
        this.db.addTag(tag);
      }
      tagIds.push(tag.id);
    }

    return {
      actorIds,
      tagIds,
    };
  }

  private async checkFileExists(filePath: string) {
    try {
      await fs.promises.stat(filePath);
      return true; // 文件存在
    } catch {
      return false; // 文件不存在
    }
  }

  private async reconcileDB(
    { success, failed }: { success: ScanResult[]; failed: FileInfo[] },
  ) {
    const actions: {
      add: string[];
      update: string[];
      failed: string[];
    } = {
      add: [],
      update: [],
      failed: [],
    };

    for (const result of success) {
      // 1. 根据番号在数据库中查找对应记录
      let dbMovie = this.db.getMovieById(result.id);
      if (!dbMovie) {
        // 2. 根据path在数据库中查找对应记录
        dbMovie = this.db.getMovieByFilePath(result.path);
      }
      if (dbMovie) {
        // 3. 如果找到，比较文件路径是否有变化
        if (dbMovie.file_path !== result.path) {
          // 判断原文件是否存在，是还是移动文件
          if (await this.checkFileExists(dbMovie.file_path)) {
            // 存在，说明是多文件movie，不做处理
          } else {
            // 不存在，说明是移动或重命名文件，更新数据

            const tagIdSet = new Set<string>();
            for (const tagName of result.tag_names) {
              const tag = this.db.getTagByName(tagName);
              if (tag) tagIdSet.add(tag.id);
            }
            dbMovie.tag_ids.forEach(id => tagIdSet.add(id));

            this.db.updateMovie(dbMovie.id, {
              file_path: result.path,
              file_added_date: result.file_added_date,
              tag_ids: Array.from(tagIdSet),
              updated_at: dayjs().valueOf(),
            });
            actions.update.push(result.path);
          }
        }
      } else {
        // 4. 如果没有找到，说明是新文件，添加到数据库

        // 处理 tag_ids 和 actor_ids
        const { tagIds, actorIds } = this.translate2IDs(result);
        this.db.addMovie({
          id: result.id,
          title: result.title,
          file_added_date: result.file_added_date,
          file_size: result.size,
          file_path: result.path,
          level: result.level,
          tag_ids: tagIds,
          actor_ids: actorIds,
          searched: result.searched,
          created_at: dayjs().valueOf(),
          updated_at: dayjs().valueOf(),
          // 下列数据先用默认值占位，后续再搜索
          release_date: 0,
          rating: 0,
          cover_url: '',
        });
        actions.add.push(result.path);
      }
    }

    failed.filter((fileInfo) => {
      const dbMovie = this.db.getMovieByFilePath(fileInfo.path);
      if (!dbMovie) {
        // 数据库中没有记录，说明之前扫描失败过的文件现在仍然无法解析，记录日志等待手动处理
        scanLogger.warn(`Failed to parse file: ${fileInfo.path}`);
        actions.failed.push(fileInfo.path);
        return true;
      }
      return false;
    });
    return actions;
  }

  public async scanMovies(dirPaths: string[]) {
    checkSignal(this.signal);
    const fileInfos = await this.scanDirectory(dirPaths);

    checkSignal(this.signal);
    const filtered = this.filterMovies(fileInfos);

    checkSignal(this.signal);
    const actions = await this.reconcileDB(filtered);
    scanLogger.log('ScanActions:', actions);
    return actions;
  }
}
