import { FileNameInfo } from './types';

/**
 * 番号匹配模式列表
 * 按优先级从高到低排列，匹配成功后立即停止
 */
const ID_PATTERNS = [
  { regex: /([A-Za-z]{2,6}-\d{2,4})/i, priority: 1 }, // SSNI-1234, MIDE-128, IPX-536
  { regex: /(FC2-\d+(?:-\d+)?)/i, priority: 2 }, // FC2-1476760-2
  { regex: /(\d{6}[-_]\d{3,})/, priority: 3 }, // 080916-226, 080916_226
  { regex: /(n\d{4})/i, priority: 4 }, // n0762
];

/**
 * 从文件名中提取包裹在括号内的标签内容
 *
 * 核心逻辑：
 * 1. 从番号位置向左右两侧扫描字符
 * 2. 识别并提取被括号包裹的内容作为标签
 * 3. 只处理紧邻番号的标签，中间只能有空格分隔
 * 4. 遇到非括号包围的文本时停止扫描
 * 5. 支持中文括号（）和英文括号 ()
 * 6. 不支持嵌套括号，遇到嵌套或交叉括号时停止扫描
 *
 * @param fileName - 去除扩展名后的文件名
 * @param idIndex - 番号在文件名中的起始位置
 * @param idLength - 番号的长度
 * @returns 包含标签列表、番号左侧剩余部分、番号右侧剩余部分的对象
 */
function extractTagsSplitAndTrim(
  fileName: string,
  idIndex: number,
  idLength: number,
): { tags: string[]; idTagLeft: string; idTagRight: string } {
  const tags: string[] = [];

  const leftBrackets = ['(', '（'];
  const rightBrackets = [')', '）'];

  function handleLeft() {
    let i = idIndex - 1;
    let currentRightBracket = -1;
    let leftBoundary = i;
    while (i >= 0) {
      const char = fileName[i];
      if (char === ' ') {
        // 空格，不处理
      } else if (rightBrackets.includes(char)) {
        if (currentRightBracket > -1) {
          // 之前有右括号, 现在有右括号，停止扫描
          break;
        } else {
          currentRightBracket = i;
        }
      } else if (leftBrackets.includes(char)) {
        if (currentRightBracket > -1) {
          const tag = fileName.substring(i + 1, currentRightBracket).trim();
          if (tag.length > 0) {
            tags.push(tag);
          }

          currentRightBracket = -1;
          leftBoundary = i - 1;
        } else {
          // 之前没有右括号, 现在却有左括号，停止扫描
          break;
        }
      } else {
        if (currentRightBracket === -1) {
          // 之前没有右括号, 现在却有其他字符，停止扫描
          break;
        }
      }

      i--;
    }
    return leftBoundary;
  }

  function handleRight() {
    let i = idIndex + idLength;
    let currentLeftBracket = -1;
    let rightBoundary = i;
    while (i < fileName.length) {
      const char = fileName[i];

      if (char === ' ') {
        // 空格，不处理
      } else if (leftBrackets.includes(char)) {
        if (currentLeftBracket > -1) {
          // 之前有左括号, 现在有左括号，停止扫描
          break;
        } else {
          currentLeftBracket = i;
        }
      } else if (rightBrackets.includes(char)) {
        if (currentLeftBracket > -1) {
          const tag = fileName.substring(currentLeftBracket + 1, i).trim();
          if (tag.length > 0) {
            tags.push(tag);
          }

          currentLeftBracket = -1;
          rightBoundary = i + 1;
        } else {
          // 之前没有左括号, 现在却有右括号，停止扫描
          break;
        }
      } else {
        if (currentLeftBracket === -1) {
          // 之前没有左括号, 现在却有其他字符，停止扫描
          break;
        }
      }

      i++;
    }
    return rightBoundary;
  }
  const leftBoundary = handleLeft();
  const rightBoundary = handleRight();

  return {
    tags,
    idTagLeft: fileName.substring(0, leftBoundary + 1).trim(),
    idTagRight: fileName.substring(rightBoundary).trim(),
  };
}

/**
 * 从文件名中解析电影信息
 *
 * 核心逻辑：
 * 1. 去除文件扩展名，仅保留文件名部分
 * 2. 使用正则表达式按优先级匹配番号（支持多种格式）
 * 3. 从番号两侧提取紧邻的括号包裹标签
 * 4. 从番号左侧提取演员名称（空格分隔）
 * 5. 从番号右侧提取电影标题
 *
 * @param name - 完整文件名（包含扩展名）
 * @returns 解析成功返回 FileNameInfo 对象，未匹配到番号返回 null
 */
export function getInfoFromName(name: string): FileNameInfo | null {
  // 初始化返回对象
  const fileNameInfo: FileNameInfo = {
    id: '',
    tag_names: [],
    actor_names: [],
    title: '',
    level: '',
    searched: false,
  };

  // 去除扩展名，只保留文件名部分
  const fileName = name.split('.')[0];

  // 1. 提取番号 - 按优先级匹配不同格式的番号
  let idIndex = -1;
  let idLength = 0;

  for (const { regex, priority } of ID_PATTERNS) {
    const match = fileName.match(regex);
    if (match) {
      if (fileNameInfo.id === '') {
        // 统一番号为大写格式
        fileNameInfo.id = match[1]?.toUpperCase();
        idIndex = match.index || 0;
        idLength = match[1].length;
        // FC2 类型的番号不需要搜索
        if (priority === 2) {
          fileNameInfo.searched = true;
        }
        break;
      }
    }
  }

  // 如果没有找到合法番号，返回失败
  if (!fileNameInfo.id) {
    return null;
  }

  // 2. 提取标签 - 被括号包裹且与番号相邻的内容
  const { tags, idTagLeft, idTagRight } = extractTagsSplitAndTrim(
    fileName,
    idIndex,
    idLength,
  );
  fileNameInfo.tag_names = tags;

  // 3. 提取演员名称 - 番号前的连续字符串，以空格分隔
  const beforeCandidates = idTagLeft.split(/\s+/).filter((s) => s.length > 0);
  for (const candidate of beforeCandidates) {
    if (!fileNameInfo.actor_names.includes(candidate)) {
      fileNameInfo.actor_names.push(candidate);
    }
  }

  // 4. 提取标题 - 番号后的剩余字符串（去除标签部分）
  fileNameInfo.title = idTagRight;

  return fileNameInfo;
}
