import fs from 'fs';
import { DatabaseJson } from './types';
import { getAbsPath } from '../utils/file';
import path from 'path';
import { DB_FILE_PATH } from '../constants';


async function readFile(relativePath: string): Promise<string> {
  const absPath = getAbsPath(relativePath);
  return fs.promises.readFile(absPath, 'utf8');
}

async function writeFile(relativePath: string, content: string): Promise<void> {
  const absPath = getAbsPath(relativePath);
  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await fs.promises.writeFile(absPath, content, 'utf8');
}


export async function loadDatabase(): Promise<DatabaseJson> {
  try {
    const content = await readFile(DB_FILE_PATH);
    const data = JSON.parse(content);
    // 简单验证结构
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.movies) &&
      Array.isArray(data.actors) &&
      Array.isArray(data.tags)
    ) {
      return data as DatabaseJson;
    } else {
      return { movies: [], actors: [], tags: [] };
    }
  } catch (error) {
    // 文件不存在或内容不合法，返回空对象
    console.error('Error loading database form file:', error);
    return { movies: [], actors: [], tags: [] };
  }
}

export async function saveDatabase(data: DatabaseJson) {
  const content = JSON.stringify(data);
  await writeFile(DB_FILE_PATH, content);
}
