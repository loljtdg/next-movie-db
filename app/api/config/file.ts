import fs from "fs";
import { getAbsPath } from "../utils/file";
import path from "path";
import { CONFIG_FILE_PATH } from "../constants";
import { ConfigJson } from "./types";

async function readFile(relativePath: string): Promise<string> {
  const absPath = getAbsPath(relativePath);
  return fs.promises.readFile(absPath, "utf8");
}

async function writeFile(relativePath: string, content: string): Promise<void> {
  const absPath = getAbsPath(relativePath);
  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await fs.promises.writeFile(absPath, content, "utf8");
}

export async function loadConfig(): Promise<ConfigJson> {
  try {
    const content = await readFile(CONFIG_FILE_PATH);
    const data = JSON.parse(content);
    // 简单验证结构
    if (
      data &&
      typeof data === "object" &&
      typeof data.webHost === "string" &&
      Array.isArray(data.scanPaths)
    ) {
      return data as ConfigJson;
    } else {
      return { webHost: '', scanPaths: [], searchCookies: [] };
    }
  } catch (error) {
    // 文件不存在或内容不合法，返回空对象
    console.error("Error loading config form file:", error);
    return { webHost: '', scanPaths: [], searchCookies: [] };
  }
}

export async function saveConfig(data: ConfigJson) {
  const content = JSON.stringify(data);
  await writeFile(CONFIG_FILE_PATH, content);
}
