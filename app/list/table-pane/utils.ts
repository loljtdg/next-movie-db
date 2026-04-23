import dayjs from 'dayjs';

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * 格式化时间戳为日期字符串
 */
export const formatDate = (timestamp: number): string => {
  if (!timestamp) return '-';
  return dayjs(timestamp).format('YYYY-MM-DD');
};
