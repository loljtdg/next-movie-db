export interface FileInfo {
  path: string;
  name: string;
  file_added_date: number; // 文件添加日期，使用时间戳表示
  size: number; // 文件大小，单位字节
}

export interface FileNameInfo {
  id: string; // 番号
  title: string; // 标题（如果能从文件名中提取）
  tag_names: string[]; // 标签 name 数组
  actor_names: string[]; // 演员 name 数组

  level: string; // 评级 (如：S、A、空字符串等)
  searched: boolean; // 是否已搜索过相关信息
}

export type ScanResult = FileInfo & FileNameInfo;


export type LogLevel = "log" | "info" | "warn" | "error" | "debug" | "trace";

export interface LogMessage {
  level: LogLevel;
  date: number; // 日志时间，使用时间戳表示
  data: unknown[];
}