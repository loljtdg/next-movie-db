import { loadConfig, saveConfig } from "../../config/file";
import { getWebHost, getWebMainURL, getWebSearchURL } from "../../constants";
import { checkSignal } from "./check-signal";
import { scanLogger } from "./log";

import puppeteer, { Page, Browser } from "puppeteer-core";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";

// puppeteer.use(StealthPlugin());

/**
 * 随机延迟，模仿人类操作，增加反爬虫难度
 */
export async function randomDelay(rate: number = 1): Promise<void> {
  // 2-5秒之间的随机延迟
  const time = Math.floor(Math.random() * 3000) + 2000;
  return new Promise((resolve) => setTimeout(resolve, Math.floor(time * rate)));
}

/**
 * Web信息接口
 */
export interface WebInfo {
  coverSrc: string;
  date: string; // 2025-03-10
  rating: number;
  tags: string[];
}

/**
 * Puppeteer网页操作类
 * 提供统一的网页操作和资源管理
 */
export class PuppeteerWeb {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private resourceBlockingEnabled: boolean = true;
  private signal: AbortSignal;

  constructor(signal: AbortSignal) {
    this.signal = signal;
  }

  /**
   * 初始化浏览器实例
   */
  private async init(): Promise<Page> {
    if (this.page) {
      return this.page;
    }

    try {
      this.browser = await puppeteer.launch({
        channel: "chrome",
        headless: false, // 非无头模式更容易通过
        args: [
          "--window-size=1920,1080", // 宽, 高
        ],
      });

      // 设置事件监听器
      this.setupBrowserEventListeners();

      const HOST = await getWebHost();
      // 设置基础cookies
      await this.browser.setCookie(
        {
          name: "over18",
          value: "1",
          domain: HOST,
          path: "/",
          expires: -1,
          secure: true,
          httpOnly: true,
        },
        {
          name: "locale",
          value: "zh",
          domain: HOST,
          path: "/",
          expires: -1,
          secure: true,
          httpOnly: true,
        },
      );

      this.page = await this.browser.newPage();
      await this.setupPageRequestInterception();
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      );

      checkSignal(this.signal);
      // 访问主页并执行登录检查
      await this.initializeSession();

      return this.page;
    } catch (error) {
      scanLogger.error("初始化浏览器失败:", error);
      throw error;
    }
  }

  /**
   * 关闭浏览器实例
   */
  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.resetState();
    }
  }

  /**
   * 获取网页信息
   */
  public async getWebInfo(id: string): Promise<WebInfo | undefined> {
    try {
      checkSignal(this.signal);
      const page = await this.init();

      // 搜索页面
      await page.goto((await getWebSearchURL()) + id, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      checkSignal(this.signal);
      await randomDelay();

      // 查找匹配的链接
      const foundLink = await this.findMatchingLink(page, id);
      if (!foundLink) {
        throw new Error(`未找到匹配的番号: ${id}`);
      }

      checkSignal(this.signal);
      // 跳转到详情页
      await page.goto(foundLink.href, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      checkSignal(this.signal);
      // 提取详细信息
      const webInfo = await this.extractWebInfo(page);
      return webInfo;
    } catch (error) {
      scanLogger.error(`爬取失败 ${id}:`, error);
    }
  }

  /**
   * 设置浏览器事件监听器
   */
  private setupBrowserEventListeners(): void {
    if (!this.browser) return;

    this.browser.on("disconnected", async () => {
      scanLogger.error("浏览器意外断开！");
      this.resetState();
    });

    this.browser.on("close", () => {
      scanLogger.log("浏览器已关闭");
      this.resetState();
    });
  }

  /**
   * 设置页面请求拦截
   */
  private async setupPageRequestInterception(): Promise<void> {
    if (!this.page) return;

    await this.page.setRequestInterception(true);

    this.page.on("request", (req: any) => {
      const blockTypes = ["image", "stylesheet", "font", "media"];
      if (
        this.resourceBlockingEnabled &&
        blockTypes.includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  /**
   * 初始化会话（访问主页，设置cookies，检查登录状态）
   */
  private async initializeSession(): Promise<void> {
    if (!this.browser || !this.page) return;

    await this.page.goto(await getWebMainURL(), {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    checkSignal(this.signal);
    await randomDelay();

    // 尝试点击同意按钮
    try {
      await this.page.click(".is-success");
    } catch (error) {
      scanLogger.log("未能点击同意按钮，可能不需要或元素不存在");
    }

    // 加载保存的cookies
    const savedCookies = (await loadConfig()).searchCookies;
    if (Array.isArray(savedCookies) && savedCookies.length > 0) {
      await this.browser.setCookie(...savedCookies);
      await this.page.reload({});
    }

    checkSignal(this.signal);
    await randomDelay();

    // 检查登录状态
    this.resourceBlockingEnabled = false;
    await this.checkLoginStatus();
    this.resourceBlockingEnabled = true;

    // 保存当前cookies
    const cookies = await this.browser.cookies();
    await saveConfig({
      ...(await loadConfig()),
      searchCookies: cookies,
    });
  }

  /**
   * 检查登录状态（递归直到成功）
   */
  private async checkLoginStatus(): Promise<void> {
    if (!this.page) return;

    checkSignal(this.signal);
    const isLoggedIn = await this.page.$$eval(
      "#navbar-menu-user a.navbar-item",
      (elements: any[]) => {
        return !elements.some((ele) => {
          const text = ele.innerText.trim();
          return text === "注冊" || text === "登入";
        });
      },
    );

    if (!isLoggedIn) {
      scanLogger.log("未登录，请手动登录");
      // 每10秒检查一次
      await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
      return await this.checkLoginStatus();
    }
  }

  /**
   * 查找匹配的搜索结果链接
   */
  private async findMatchingLink(
    page: Page,
    id: string,
  ): Promise<{ title: string; href: string } | null> {
    const links: { title: string; href: string }[] = await page.$$eval(
      ".movie-list .item a",
      (elements: any[]) => {
        return elements
          .map((el) => {
            const titleElement = el.querySelector(".video-title");
            const title = titleElement ? titleElement.innerText.trim() : "";
            const href = el.href || "";

            return {
              title,
              href,
            };
          })
          .filter((link) => link.title && link.href); // 过滤掉无效链接
      },
    );

    // 标准化文本的函数
    const normalizeTitle = (t: string) =>
      t.trim().toUpperCase().replace(/[-_]/g, "-");

    const normalizedId = normalizeTitle(id);
    const foundLink = links.find(({ title }) =>
      normalizeTitle(title).startsWith(normalizedId),
    );

    return foundLink || null;
  }

  /**
   * 从页面提取详细信息
   */
  private async extractWebInfo(page: Page): Promise<WebInfo> {
    return await page.$eval(".video-meta-panel", (element: any) => {
      const coverSrc = element.querySelector(".video-cover")?.src || "";

      let date = "";
      let rating = 0;
      let tags: string[] = [];

      const panelBlocks = Array.from(element.querySelectorAll(".panel-block"));

      panelBlocks.forEach((block: any) => {
        const keyElement = block.querySelector("strong");
        if (!keyElement) return;

        const key = keyElement.innerText.trim();

        if (key.includes("日期")) {
          const valueElement = block.querySelector(".value");
          if (valueElement) {
            date = valueElement.innerText.trim();
          }
        } else if (key.includes("評分")) {
          const valueElement = block.querySelector(".value");
          if (valueElement) {
            const match = valueElement.innerText.trim().match(/(\d+\.?\d*)分/);
            if (match && match[1]) {
              rating = parseFloat(match[1]);
            }
          }
        } else if (key.includes("類別")) {
          const tagElements = block.querySelectorAll(".value a");
          tags = Array.from(tagElements).map((el: any) => el.innerText.trim());
        }
      });

      return {
        coverSrc,
        date,
        rating,
        tags,
      };
    });
  }

  /**
   * 重置内部状态
   */
  private resetState(): void {
    this.browser = null;
    this.page = null;
  }
}
