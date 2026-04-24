import { DatabaseJson, Movie, Actor, DBTag } from "./types";
import { loadDatabase, saveDatabase } from "./file";

export class Database {
  private data: DatabaseJson;
  private saveTimeout: NodeJS.Timeout | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.data = { movies: [], actors: [], tags: [] };
  }

  async load(): Promise<void> {
    this.loadPromise = loadDatabase().then((data) => {
      this.data = data;
    });
    return this.loadPromise;
  }

  save(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      saveDatabase(this.data);
      this.saveTimeout = null;
    }, 200); // 防抖：延迟 200ms，期间再次调用重置定时器
  }

  async getFullData(): Promise<DatabaseJson> {
    await this.loadPromise;
    return this.data;
  }

  // Movies
  getMovieById(id: string): Movie | undefined {
    return this.data.movies.find((m) => m.id === id);
  }

  getMovieByFilePath(filePath: string): Movie | undefined {
    return this.data.movies.find((m) => m.file_path === filePath);
  }

  getMovies(): Movie[] {
    return this.data.movies;
  }

  addMovie(movie: Movie): void {
    this.data.movies.push(movie);
    this.save();
  }

  updateMovie(
    id: string,
    updates: Partial<Movie> & { review?: "unreview" | "reviewed" | "unnice" },
  ): Movie | undefined {
    const index = this.data.movies.findIndex((m) => m.id === id);
    if (index !== -1) {
      const movie = this.data.movies[index];

      // 处理 review 字段的特殊逻辑
      if ("review" in updates) {
        const reviewValue = updates.review;
        if (reviewValue === "unreview") {
          // 设置为 unreview 时，删除 review 字段（兼容 undefined）
          delete (movie as any).review;
        } else if (reviewValue) {
          movie.review = reviewValue;
        }
      }

      // 处理其他字段更新
      const { review, ...otherUpdates } = updates;
      Object.assign(movie, otherUpdates);

      this.save();
      return movie;
    }
    return undefined;
  }

  deleteMovie(id: string): void {
    const index = this.data.movies.findIndex((m) => m.id === id);
    if (index > -1) {
      this.data.movies.splice(index, 1);
      this.save();
    }
  }

  // Actors
  getActorByName(name: string): Actor | undefined {
    return this.data.actors.find(
      (a) => a.name === name || a.aliases.includes(name),
    );
  }

  getActors(): Actor[] {
    return this.data.actors;
  }

  addActor(actor: Actor): void {
    this.data.actors.push(actor);
    this.save();
  }

  deleteActor(id: string): void {
    const index = this.data.actors.findIndex((a) => a.id === id);
    if (index > -1) {
      this.data.actors.splice(index, 1);
      this.save();
    }
  }

  //   updateActor(id: string, updates: Partial<Actor>): void {
  //     const index = this.data.actors.findIndex(a => a.id === id);
  //     if (index !== -1) {
  //       this.data.actors[index] = { ...this.data.actors[index], ...updates };
  //       this.save();
  //     }
  //   }

  // Tags
  getTagByName(name: string): DBTag | undefined {
    return this.data.tags.find(
      (t) => t.name === name || t.aliases.includes(name),
    );
  }

  getTags(): DBTag[] {
    return this.data.tags;
  }

  addTag(tag: DBTag): void {
    this.data.tags.push(tag);
    this.save();
  }

  deleteTag(id: string): void {
    const index = this.data.tags.findIndex((t) => t.id === id);
    if (index > -1) {
      this.data.tags.splice(index, 1);
      this.save();
    }
  }

  //   updateTag(id: string, updates: Partial<DBTag>): void {
  //     const index = this.data.tags.findIndex(t => t.id === id);
  //     if (index !== -1) {
  //       this.data.tags[index] = { ...this.data.tags[index], ...updates };
  //       this.save();
  //     }
  //   }
}

const instance = new Database();
instance.load();

export const db = instance;
