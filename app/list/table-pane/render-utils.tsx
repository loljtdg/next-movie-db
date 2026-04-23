// 评分文字颜色
export const getRatingType = (rating: number) => {
  if (rating >= 4.6) return 'success';
  if (rating >= 4.5) return undefined;
  if (rating >= 4.4) return 'secondary';
  return 'warning';
};
