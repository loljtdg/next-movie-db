import { Cookie } from "puppeteer-core";

export interface ConfigJson {
  webHost: string;
  scanPaths: string[];
  searchCookies: Cookie[];
}

export interface PutConfigBody {
  webHost?: string;
  scanPaths?: string[];
}