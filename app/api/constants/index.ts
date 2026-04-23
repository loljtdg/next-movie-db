import { loadConfig } from "../config/file";

export const SCAN_BLACK_PATH_LIST = ["[欧美]", "un nice"]; // 添加不想扫描的目录或文件关键字

export const DB_FILE_PATH = "./data/database.json";

export const CONFIG_FILE_PATH = "./data/cfg.json";

export const IMG_PATH = "./data/imgs/";

export const getWebHost = async () => {
  return (await loadConfig()).webHost;
};

export const getWebMainURL = async () => {
  return `https://${await getWebHost()}?locale=zh`;
};

export const getWebSearchURL = async () => {
  return `https://${await getWebHost()}/search?f=all&q=`;
};
