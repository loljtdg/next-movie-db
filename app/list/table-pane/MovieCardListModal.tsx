import {
  Modal,
  Image,
  Space,
  Tag,
  Typography,
  Button,
  Rate,
  Tooltip,
} from 'antd';
import { PlaySquareOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Actor, DBTag, Movie } from '../../api/db/types';
import { formatDate } from './utils';
import { DataType } from './types';
import { getRatingType } from './render-utils';
import { fallbackImage } from './fallback-image';
import { openFile } from './open';

const { Text, Paragraph } = Typography;

export function MovieCardListModal({
  currentPageData,
  otherData,
  visible,
  onCancel,
}: {
  currentPageData: Movie[];
  otherData: Pick<DataType, 'actorMap' | 'tagMap'>;
  visible: boolean;
  onCancel: () => void;
}) {
  const { actorMap, tagMap } = otherData;

  // 渲染电影卡片
  const renderMovieCard = (movie: Movie) => {
    const actors = movie.actor_ids
      .map((id) => actorMap.get(id))
      .filter(Boolean) as Actor[];

    const tagInfos = movie.tag_ids
      .map((id) => tagMap.get(id))
      .filter(Boolean) as DBTag[];

    tagInfos.sort((a, b) => {
      const mainRes = (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0);
      if (mainRes !== 0) {
        return mainRes;
      }
      return a.name.localeCompare(b.name);
    });

    return (
      <div
        key={movie.id}
        style={{
          minWidth: 300,
          width: 'calc(25% - 10px)',
          flex: 1,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Image
          src={movie.cover_url || fallbackImage}
          alt={movie.id}
          width="100%"
          style={{ objectFit: 'cover' }}
          fallback={fallbackImage}
        />
        <div style={{ padding: 6 }}>
          <Paragraph
            ellipsis={{
              rows: 2,
              tooltip: {
                title: movie.title,
              },
            }}
            style={{ marginBottom: 0 }}
          >
            <Tag color="magenta" style={{ marginRight: 4 }}>
              <Text strong>{movie.id}</Text>
            </Tag>
            {movie.title}
          </Paragraph>

          <Space>
            <Rate
              allowHalf
              disabled
              value={movie.rating}
              style={{ fontSize: 14 }}
            />
            <Text type={getRatingType(movie.rating)}>{movie.rating} 分</Text>
          </Space>

          <Space
            wrap
            size={4}
            style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 6 }}
          >
            {actors.map((actor) => (
              <Tooltip key={actor.id} title={actor.aliases.join(', ')}>
                <Tag key={actor.id} color="blue" style={{ margin: 0 }}>
                  {actor.name}
                </Tag>
              </Tooltip>
            ))}
            {tagInfos.slice(0, 5).map((tag) => (
              <Tooltip key={tag.id} title={tag.aliases.join(', ')}>
                <Tag
                  key={tag.id}
                  color={tag.is_main ? 'purple' : 'default'}
                  style={{ margin: 0 }}
                >
                  {tag.name}
                </Tag>
              </Tooltip>
            ))}
            {tagInfos.length > 5 && (
              <Tooltip
                title={tagInfos
                  .slice(5)
                  .map((t) => t.name)
                  .join(', ')}
              >
                <Tag>+{tagInfos.length - 5}</Tag>
              </Tooltip>
            )}
          </Space>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                上映: {formatDate(movie.release_date)}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                添加: {formatDate(movie.file_added_date)}
              </Text>
            </Space>

            <Space>
              <Tooltip title="播放">
                <Button
                  icon={<PlaySquareOutlined />}
                  size="small"
                  onClick={() => {
                    openFile(movie.file_path, 'file');
                  }}
                />
              </Tooltip>
              <Tooltip title="打开文件夹">
                <Button
                  icon={<FolderOpenOutlined />}
                  size="small"
                  onClick={() => {
                    openFile(movie.file_path, 'folder');
                  }}
                />
              </Tooltip>
            </Space>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      title="卡片视图"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width="96%"
      height="96%"
      style={{
        top: '2%',
      }}
      styles={{
        body: {
          padding: 0,
          height: 'calc(96vh - 72px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        },
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          minHeight: '100%',
          gap: 10,
        }}
      >
        {currentPageData.map(renderMovieCard)}
      </div>
    </Modal>
  );
}