export interface DatabaseJson {
  movies: Movie[];
  actors: Actor[];
  tags: DBTag[];
}

export interface Movie {
  id: string; // 主键，电影番号
  title: string; // 电影标题
  release_date: number; // 上映日期，时间戳
  rating: number; // 评分 (0-10)
  tag_ids: string[]; // 标签 id 数组
  cover_url: string; // 封面图片地址
  file_added_date: number; // 文件添加日期，时间戳
  file_size: number; // 文件大小 (字节)
  file_path: string; // 文件路径
  level: string; // 评级 (如：S、A、0等)
  searched: boolean; // 是否已搜索过相关信息
  actor_ids: string[]; // 关联演员 ID 数组
  created_at: number; // 记录创建时间，时间戳
  updated_at: number; // 记录更新时间，时间戳
}

export interface Actor {
  id: string; // 主键，演员唯一ID
  name: string; // 最主要的名称
  aliases: string[]; // 其他曾用名数组
  created_at: number; // 记录创建时间，时间戳
  updated_at: number; // 记录更新时间，时间戳
}

export interface DBTag {
  id: string; // 主键（tag_id）
  name: string; // 标签名称（例如：剧情、剧情片、爱情等）
  aliases: string[]; // 其他名称数组
  is_main?: boolean; // 是否为主要标签（true表示主要标签，其他表示次要标签）
  created_at: number; // 记录创建时间，时间戳
  updated_at: number; // 记录更新时间，时间戳
}

