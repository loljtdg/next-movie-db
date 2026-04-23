import fs from 'fs';
import * as OpenCC from 'opencc-js';
import dayjs from 'dayjs';
import path from 'path';

import { Database } from '../../db/db';
import { Movie } from '../../db/types';
import { PuppeteerWeb, randomDelay } from './puppeteer';
import { getAbsPath } from '../../utils/file';
import { checkSignal } from './check-signal';
import { scanLogger } from './log';
import { IMG_PATH } from '../../constants';

const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });

function getImageExtension(url: string) {
  // 移除查询参数和锚点
  const cleanUrl = url.split('?')[0].split('#')[0];

  // 获取最后一个点号后的内容
  const match = cleanUrl.match(/\.([^.]+)$/);

  return match ? match[1].toLowerCase() : null;
}

export class MoviesSearcher {
  private requestIndex = 0;
  private signal: AbortSignal;
  private db: Database;
  private puppeteerWeb: PuppeteerWeb;

  constructor(signal: AbortSignal, db: Database) {
    this.signal = signal;
    this.db = db;
    this.puppeteerWeb = new PuppeteerWeb(signal);
  }

  async searchMovies() {
    const moviesForSearch = this.db
      .getMovies()
      .filter((movie) => !movie.searched);
    const searchActions = {
      success: [] as string[],
      failed: [] as string[],
    };
    this.signal.addEventListener(
      'abort',
      () => {
        this.puppeteerWeb.close();
      },
      {
        // once: true,
      },
    );
    // 连续失败次数过多时，直接停止，避免被目标网站封禁
    let consecutiveFailures = 0;
    for (const movie of moviesForSearch) {
      checkSignal(this.signal);
      const taskResult = await this.singleSearch(movie);
      if (taskResult) {
        searchActions.success.push(movie.id);
        consecutiveFailures = 0; // 成功后重置失败计数
      } else {
        searchActions.failed.push(movie.id);
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
          throw new Error('Search consecutive failures, Terminating process.');
        }
      }
    }
    await this.puppeteerWeb.close();
    scanLogger.log('SearchActions:', searchActions);

    const downloadImgActions = {
      success: [] as string[],
      failed: [] as string[],
    };
    const moviesForDownloadImg = this.db.getMovies().filter((movie) => {
      return movie.cover_url.startsWith('http');
    });
    for (const movie of moviesForDownloadImg) {
      checkSignal(this.signal);
      const taskResult = await this.singleDownloadImg(movie);
      if (taskResult) {
        downloadImgActions.success.push(movie.id);
      } else {
        downloadImgActions.failed.push(movie.id);
      }
    }
    scanLogger.log('DownloadImgActions:', downloadImgActions);

    return { searchActions, downloadImgActions };
  }

  private async singleSearch(movie: Movie) {
    this.requestIndex++;
    if (this.requestIndex > 1) {
      checkSignal(this.signal);
      await new Promise((resolve) => setTimeout(resolve, 40 * 1000)); // 每个请求间隔至少40s，避免过快被目标网站封禁
      randomDelay(
        Math.min(this.requestIndex, 120) / 30 + this.requestIndex / 1000,
      );
      if (Math.random() > 0.8) {
        await randomDelay(10);
      }
    }

    checkSignal(this.signal);
    scanLogger.log('开始搜索:', movie.id);
    const webInfo = await this.puppeteerWeb.getWebInfo(movie.id);

    checkSignal(this.signal);
    if (!webInfo) {
      return null;
    }
    // 处理标签、date等信息，更新数据库记录.图片下载后续再处理
    const release_date = dayjs(webInfo.date).valueOf();

    const tagIdsSet: Set<string> = new Set(movie.tag_ids);
    for (const tagName of webInfo.tags) {
      const convertedTagName = converter(tagName); // 将标签名称转换为简体中文
      let tag = this.db.getTagByName(convertedTagName);
      if (!tag) {
        // 如果标签不存在，可以创建一个新的
        tag = {
          id: `tag_${crypto.randomUUID()}`, // 简单的 ID 生成方式
          name: convertedTagName,
          is_main: false, // 从网络解析的标签不是主要标签
          aliases: [],
          created_at: dayjs().valueOf(),
          updated_at: dayjs().valueOf(),
        };
        this.db.addTag(tag);
      }
      tagIdsSet.add(tag.id);
    }

    return this.db.updateMovie(movie.id, {
      release_date,
      rating: webInfo.rating,
      cover_url: webInfo.coverSrc,
      tag_ids: Array.from(tagIdsSet),
      searched: true,
      updated_at: dayjs().valueOf(),
    });
  }

  private async checkLocalImg(movieId: string): Promise<string | null> {
    const dir = getAbsPath(IMG_PATH + movieId);
    const entries = await fs.promises
      .readdir(dir, { withFileTypes: true })
      .catch(() => {});
    const firstFile = entries?.find((entry) => entry.isFile());
    if (firstFile) {
      const absPath = path.resolve(dir, firstFile.name);
      return path.relative(getAbsPath(''), absPath);
    }
    return null;
  }

  // 从网络下载图片并保存到本地，返回本地路径
  private async saveWebImg(movieId: string, webUrl: string): Promise<string> {
    const dir = getAbsPath(IMG_PATH + movieId);

    const response = await fetch(webUrl, {
      signal: this.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.promises.mkdir(dir, { recursive: true });
    const imgPath = path.resolve(
      dir,
      'cover.' + (getImageExtension(webUrl) || 'jpg'),
    );
    await fs.promises.writeFile(imgPath, buffer);

    return path.relative(getAbsPath(''), imgPath);
  }

  private async singleDownloadImg(movie: Movie): Promise<Movie | undefined> {
    try {
      checkSignal(this.signal);
      const localImgPath = await this.checkLocalImg(movie.id);
      if (localImgPath) {
        return this.db.updateMovie(movie.id, {
          cover_url: localImgPath,
          updated_at: dayjs().valueOf(),
        });
      }

      checkSignal(this.signal);
      await randomDelay(0.5);

      checkSignal(this.signal);
      const imgPath = await this.saveWebImg(movie.id, movie.cover_url);
      if (imgPath) {
        return this.db.updateMovie(movie.id, {
          cover_url: imgPath,
          updated_at: dayjs().valueOf(),
        });
      }
    } catch (error) {
      scanLogger.error(`Error singleDownloadImg ${movie.id}:`, error);
    }
  }
}
