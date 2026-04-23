import path from 'path';

export function getAbsPath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}
