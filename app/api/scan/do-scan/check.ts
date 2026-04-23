import fs from "fs";
import { Database } from "../../db/db";
import { checkSignal } from "./check-signal";
import { scanLogger } from "./log";
import { Actor, DBTag, Movie } from "../../db/types";
import { getAbsPath } from "../../utils/file";
import { IMG_PATH } from "../../constants";

export class MoviesChecker {
  private signal: AbortSignal;
  private db: Database;

  constructor(signal: AbortSignal, db: Database) {
    this.signal = signal;
    this.db = db;
  }

  private async checkMoviePath(): Promise<string[]> {
    const movies = this.db.getMovies();
    const disAccess: Movie[] = [];
    const deleteMovies: string[] = [];
    for (const movie of movies) {
      checkSignal(this.signal);
      try {
        await fs.promises.access(movie.file_path);
      } catch (e) {
        disAccess.push(movie);
        scanLogger.warn(`File not accessible: ${movie.file_path}`, e);
      }
    }
    if (disAccess.length) {
      // 执行确认后的操作，删除不存在的Movie记录
      for (const movie of disAccess) {
        scanLogger.log(`删除不存在的Movie记录: ${movie.id}`);
        const url = movie.cover_url;
        if (url && !url.startsWith("http")) {
          checkSignal(this.signal);
          const imgDir = getAbsPath(IMG_PATH + movie.id);
          try {
            await fs.promises.access(imgDir);
            await fs.promises.rm(imgDir, {
              recursive: true,
            });
            scanLogger.log(`图片路径已删除: ${imgDir}`);
          } catch (e) {
            scanLogger.error(`删除图片路径失败: ${imgDir}`, e);
          }
        }

        this.db.deleteMovie(movie.id);
        deleteMovies.push(movie.id);
      }
    }
    return deleteMovies;
  }

  private checkActors(): string[] {
    const actors = this.db.getActors();
    const disAccess: Actor[] = [];
    const deleteActors: string[] = [];

    const movies = this.db.getMovies();
    for (const actor of actors) {
      const findM = movies.find((m) => m.actor_ids.includes(actor.id));
      if (!findM) {
        disAccess.push(actor);
        scanLogger.warn(`Actor no movie: ${actor.name}`);
      }
    }

    if (disAccess.length) {
      for (const actor of disAccess) {
        scanLogger.log(`删除没有Movie的Actor记录: ${actor.name}`);
        this.db.deleteActor(actor.id);
        deleteActors.push(actor.id);
      }
    }

    return deleteActors;
  }

  private checkTags(): string[] {
    const tags = this.db.getTags();
    const disAccess: DBTag[] = [];
    const deleteTags: string[] = [];

    const movies = this.db.getMovies();
    for (const tag of tags) {
      const findM = movies.find((m) => m.tag_ids.includes(tag.id));
      if (!findM) {
        disAccess.push(tag);
        scanLogger.warn(`Tag no movie: ${tag.name}`);
      }
    }

    if (disAccess.length) {
      scanLogger.log(`删除没有Movie的Tag记录: ${disAccess.length}`);
      for (const tag of disAccess) {
        this.db.deleteTag(tag.id);
        deleteTags.push(tag.id);
      }
    }

    return deleteTags;
  }

  public async runCheck(): Promise<{
    deleteMovies: string[];
    deleteActors: string[];
    deleteTags: string[];
  }> {
    checkSignal(this.signal);
    const deleteMovies = await this.checkMoviePath();
    checkSignal(this.signal);
    const deleteActors = this.checkActors();
    checkSignal(this.signal);
    const deleteTags = this.checkTags();

    const checkActions = { deleteMovies, deleteActors, deleteTags };

    scanLogger.warn('CheckActions:', checkActions);

    return checkActions;
  }
}
