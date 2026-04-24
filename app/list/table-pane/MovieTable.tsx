import {
  Input,
  Space,
  Button,
  Rate,
  Tag,
  Tooltip,
  Select,
  Table,
  Image,
  Typography,
  DatePicker,
  InputNumber,
  Modal,
  message,
} from "antd";

import {
  SearchOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  PlaySquareOutlined,
  CloseOutlined,
  AppstoreOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";

import { Actor, DBTag, Movie } from "../../api/db/types";
import { DataType } from "./types";
import { formatDate, formatFileSize } from "./utils";
import { MovieCardListModal } from "./MovieCardListModal";
import { getRatingType } from "./render-utils";
import { fallbackImage } from "./fallback-image";
import { openFile } from "./open";

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;

const rangePickerPresets = [
  { label: "过去30天", value: [dayjs().subtract(30, "day"), dayjs()] },
  { label: "过去90天", value: [dayjs().subtract(90, "day"), dayjs()] },
  { label: "过去180天", value: [dayjs().subtract(180, "day"), dayjs()] },
  { label: "今年", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
  {
    label: dayjs().subtract(1, "year").format("YYYY年"),
    value: [
      dayjs().subtract(1, "year").startOf("year"),
      dayjs().subtract(1, "year").endOf("year"),
    ],
  },
  {
    label: dayjs().subtract(2, "year").format("YYYY年"),
    value: [
      dayjs().subtract(2, "year").startOf("year"),
      dayjs().subtract(2, "year").endOf("year"),
    ],
  },
  {
    label: dayjs().subtract(3, "year").format("YYYY年"),
    value: [
      dayjs().subtract(3, "year").startOf("year"),
      dayjs().subtract(3, "year").endOf("year"),
    ],
  },
  {
    label: dayjs().subtract(4, "year").format("YYYY年"),
    value: [
      dayjs().subtract(4, "year").startOf("year"),
      dayjs().subtract(4, "year").endOf("year"),
    ],
  },
  {
    label: dayjs().subtract(5, "year").format("YYYY年"),
    value: [
      dayjs().subtract(5, "year").startOf("year"),
      dayjs().subtract(5, "year").endOf("year"),
    ],
  },
  {
    label: dayjs().subtract(6, "year").format("YYYY年"),
    value: [
      dayjs().subtract(6, "year").startOf("year"),
      dayjs().subtract(6, "year").endOf("year"),
    ],
  },
  {
    label: dayjs().subtract(7, "year").format("YYYY年"),
    value: [
      dayjs().subtract(7, "year").startOf("year"),
      dayjs().subtract(7, "year").endOf("year"),
    ],
  },
  {
    label: dayjs().subtract(8, "year").format("YYYY年"),
    value: [
      dayjs().subtract(8, "year").startOf("year"),
      dayjs().subtract(8, "year").endOf("year"),
    ],
  },
  {
    label: dayjs().subtract(9, "year").format("YYYY年"),
    value: [
      dayjs().subtract(9, "year").startOf("year"),
      dayjs().subtract(9, "year").endOf("year"),
    ],
  },
];

// 表格分页配置
const paginationConfig = {
  defaultPageSize: 50,
  showSizeChanger: true,
  pageSizeOptions: ["10", "20", "50", "100"],
  showTotal: (total: number, range: [number, number]) =>
    `${range[0]}-${range[1]} 条，共 ${total} 条`,
};

export function MovieTable({
  data,
  loading,
  buttonContainerRef,
}: {
  data: DataType;
  loading: boolean;
  buttonContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { movies, actorMap, tagMap } = data;
  const [currentPageData, setCurrentPageData] = useState<Movie[]>([]);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [movieList, setMovieList] = useState<Movie[]>(movies);

  useEffect(() => {
    setCurrentPageData(movies.slice(0, paginationConfig.defaultPageSize));
    setMovieList(movies);
  }, [movies]);

  const handleReviewEdit = (movie: Movie) => {
    let selectedReview: "unreview" | "reviewed" | "unnice" =
      movie.review || "unreview";

    Modal.confirm({
      title: `标记 Review - ${movie.id}`,
      content: (
        <Select
          defaultValue={movie.review || "unreview"}
          onChange={(value: "unreview" | "reviewed" | "unnice") => {
            selectedReview = value;
          }}
          options={[
            { label: "未标记", value: "unreview" },
            { label: "已阅", value: "reviewed" },
            { label: "不佳", value: "unnice" },
          ]}
          style={{ width: "100%", marginTop: 16 }}
        />
      ),
      onOk: async () => {
        try {
          await axios.put("/api/db/movie-review", {
            id: movie.id,
            review: selectedReview,
          });
          message.success("更新成功");
          // 更新本地状态
          setMovieList((prev) =>
            prev.map((m) =>
              m.id === movie.id
                ? {
                    ...m,
                    review: selectedReview,
                  }
                : m,
            ),
          );
        } catch (error) {
          message.error("更新失败");
        }
      },
    });
  };

  // 标签选项列表（用于标签筛选）
  const tagOptions = useMemo(() => {
    return Array.from(tagMap.values())
      .sort((a, b) => {
        const mainRes = (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0);
        if (mainRes !== 0) {
          return mainRes;
        }
        return a.name.localeCompare(b.name);
      })
      .map((tag) => ({
        label:
          tag.name + (tag.aliases.length ? ` (${tag.aliases.join(", ")})` : ""),
        value: tag.id,
      }));
  }, [tagMap]);

  const actorOptions = useMemo(() => {
    return Array.from(actorMap.values())
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      })
      .map((actor) => ({
        label:
          actor.name +
          (actor.aliases.length ? ` (${actor.aliases.join(", ")})` : ""),
        value: actor.id,
      }));
  }, [actorMap]);

  // 定义表格列配置
  const columns: ColumnsType<Movie> = useMemo(() => {
    return [
      {
        title: "封面",
        dataIndex: "cover_url",
        key: "cover_url",
        width: 200,
        render: (url: string, record) => (
          <Image
            src={url || fallbackImage}
            alt={record.id}
            height={100}
            fallback={fallbackImage}
          />
        ),
      },
      {
        title: "番号",
        dataIndex: "id",
        key: "id",
        width: 130,
        sorter: (a, b) => a.id.localeCompare(b.id),
        render: (text, record) => (
          <Space align="start" orientation="vertical">
            <Tag color="magenta">
              <Text strong>{text}</Text>
            </Tag>
            <Space>
              <Tooltip title="播放">
                <Button
                  icon={<PlaySquareOutlined />}
                  size="small"
                  onClick={() => {
                    openFile(record.file_path, "file");
                  }}
                />
              </Tooltip>
              <Tooltip title="打开文件夹">
                <Button
                  icon={<FolderOpenOutlined />}
                  size="small"
                  onClick={() => {
                    openFile(record.file_path, "folder");
                  }}
                />
              </Tooltip>
            </Space>
          </Space>
        ),
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => (
          <div style={{ padding: 8 }}>
            <Search
              placeholder="搜索番号"
              value={selectedKeys[0] as any}
              onChange={(e) =>
                setSelectedKeys(e.target.value ? [e.target.value] : [])
              }
              enterButton
              allowClear
              onPressEnter={() => confirm()}
              onSearch={() => confirm()}
              onClear={() => confirm()}
            />
          </div>
        ),
        onFilter: (value, record) => {
          const searchText = (value as string)?.toLowerCase() || "";
          return record.id?.toLowerCase().includes(searchText);
        },
        filterIcon: (filtered: boolean) => (
          <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
      },
      {
        title: "标题",
        dataIndex: "title",
        key: "title",
        width: 200,
        render: (text) => (
          <Paragraph
            ellipsis={{
              rows: 3,
              tooltip: {
                title: text,
              },
            }}
          >
            {text}
          </Paragraph>
        ),
        sorter: (a, b) => a.title.localeCompare(b.title),
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => (
          <div style={{ padding: 8 }}>
            <Search
              placeholder="搜索标题"
              value={selectedKeys[0] as any}
              onChange={(e) =>
                setSelectedKeys(e.target.value ? [e.target.value] : [])
              }
              enterButton
              allowClear
              onPressEnter={() => confirm()}
              onSearch={() => confirm()}
              onClear={() => confirm()}
            />
          </div>
        ),
        onFilter: (value, record) => {
          const searchText = (value as string)?.toLowerCase() || "";
          return record.title?.toLowerCase().includes(searchText);
        },
        filterIcon: (filtered: boolean) => (
          <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
      },
      {
        title: "演员",
        dataIndex: "actor_ids",
        key: "actors",
        width: 150,
        render: (actorIds: string[]) => {
          const actors = actorIds
            .map((id) => actorMap.get(id))
            .filter(Boolean) as Actor[];
          return (
            <Space wrap size={4}>
              {actors.map((actor) => (
                <Tooltip key={actor.id} title={actor.aliases.join(", ")}>
                  <Tag key={actor.id} color="blue" style={{ margin: 0 }}>
                    {actor.name}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          );
        },
        sorter: (a, b) => {
          const aNames = a.actor_ids
            .map((id) => actorMap.get(id)?.name)
            .filter(Boolean)
            .join("__");
          const bNames = b.actor_ids
            .map((id) => actorMap.get(id)?.name)
            .filter(Boolean)
            .join("__");

          return aNames.localeCompare(bNames);
        },

        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => (
          <div style={{ padding: 8, width: 250 }}>
            <Select
              placeholder="选择演员"
              value={selectedKeys[0]}
              onChange={(value: any) => {
                setSelectedKeys(value ? [value] : []);
                confirm();
              }}
              options={actorOptions}
              style={{ width: "100%" }}
              showSearch={{
                filterOption: (input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
              allowClear
            />
          </div>
        ),
        onFilter: (value, record) => {
          if (!value) return true;
          const selectedActorIds = (value as string).split(",");
          if (selectedActorIds.length === 0) return true;
          return selectedActorIds.some((id) => record.actor_ids.includes(id));
        },
        filterIcon: (filtered: boolean) => (
          <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
      },
      {
        title: "线上评分",
        dataIndex: "rating",
        key: "rating",
        width: 120,
        sorter: (a, b) => a.rating - b.rating,
        render: (rating: number) => (
          <Space orientation="vertical" size={2}>
            <Rate allowHalf disabled value={rating} style={{ fontSize: 14 }} />
            <Text type={getRatingType(rating)}>{rating} 分</Text>
          </Space>
        ),
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => {
          const [min, max] = selectedKeys[0]
            ? (selectedKeys[0] as string).split("-").map(Number)
            : [0, 5];
          return (
            <div style={{ padding: 8, width: 240 }}>
              <Space align="center">
                <InputNumber
                  min={0}
                  max={5}
                  precision={2}
                  step={0.1}
                  defaultValue={0}
                  style={{ width: 70 }}
                  formatter={(value) => Number(value).toFixed(2)}
                  value={min}
                  onChange={(value) => {
                    setSelectedKeys([[value, max].join("-")]);
                  }}
                />
                -
                <InputNumber
                  min={0}
                  max={5}
                  precision={2}
                  step={0.1}
                  defaultValue={5}
                  style={{ width: 70 }}
                  formatter={(value) => Number(value).toFixed(2)}
                  value={max}
                  onChange={(value) => {
                    setSelectedKeys([[min, value].join("-")]);
                  }}
                />
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setSelectedKeys([]);
                    confirm?.();
                  }}
                ></Button>
                <Button
                  icon={<SearchOutlined />}
                  type="primary"
                  onClick={() => confirm?.()}
                ></Button>
              </Space>
            </div>
          );
        },
        onFilter: (value, record) => {
          if (!value) return true;
          const [min, max] = (value as string).split("-").map(Number);
          const rating = record.rating;
          return rating >= min && rating <= max;
        },
        filterIcon: (filtered: boolean) => (
          <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
      },
      {
        title: "标签",
        dataIndex: "tag_ids",
        key: "tags",
        width: 180,
        render: (tagIds: string[]) => {
          const tagInfos = tagIds
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
            <Space wrap size={4}>
              {tagInfos.slice(0, 6).map((tag) => (
                <Tooltip key={tag.id} title={tag.aliases.join(", ")}>
                  <Tag
                    key={tag.id}
                    color={tag.is_main ? "purple" : "default"}
                    style={{ margin: 0 }}
                  >
                    {tag.name}
                  </Tag>
                </Tooltip>
              ))}
              {tagInfos.length > 6 && (
                <Tooltip
                  title={tagInfos
                    .slice(6)
                    .map((t) => t.name)
                    .join(", ")}
                >
                  <Tag>+{tagInfos.length - 6}</Tag>
                </Tooltip>
              )}
            </Space>
          );
        },
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => (
          <div style={{ padding: 8, width: 250 }}>
            <Select
              mode="multiple"
              placeholder="选择标签"
              value={
                selectedKeys[0] ? (selectedKeys[0] as string).split("#") : []
              }
              onChange={(values) => {
                setSelectedKeys(values.length ? [values.join("#")] : []);
                confirm();
              }}
              options={tagOptions}
              style={{ width: "100%" }}
              showSearch={{
                filterOption: (input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
              allowClear
            />
          </div>
        ),
        onFilter: (value, record) => {
          if (!value) return true;
          const selectedTagIds = (value as string).split("#");
          if (selectedTagIds.length === 0) return true;
          return selectedTagIds.some((id) => record.tag_ids.includes(id));
        },
        filterIcon: (filtered: boolean) => (
          <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
      },
      {
        title: "添加日期",
        dataIndex: "file_added_date",
        key: "file_added_date",
        width: 110,
        sorter: (a, b) => a.file_added_date - b.file_added_date,
        render: (timestamp: number) => formatDate(timestamp),
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => {
          const [start, end] = String(selectedKeys[0])?.split("-") || [];
          const rangeValue =
            start && end ? [dayjs(Number(start)), dayjs(Number(end))] : null;

          const handleRangeChange = (dates: any) => {
            if (dates && dates[0] && dates[1]) {
              setSelectedKeys([`${dates[0].valueOf()}-${dates[1].valueOf()}`]);
            } else {
              setSelectedKeys([]);
            }
            confirm();
          };

          return (
            <div style={{ padding: 8, width: 250 }}>
              <RangePicker
                value={rangeValue as any}
                onChange={handleRangeChange}
                placeholder={["起始日期", "结束日期"]}
                presets={rangePickerPresets as any}
              />
            </div>
          );
        },
        onFilter: (value, record) => {
          if (!value) return true;
          const [start, end] = (value as string).split("-").map(Number);
          if (!start || !end) return true;
          const addedDate = record.file_added_date;
          return addedDate >= start && addedDate <= end;
        },
        filterIcon: (filtered: boolean) => (
          <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
      },
      {
        title: "上映日期",
        dataIndex: "release_date",
        key: "release_date",
        width: 110,
        sorter: (a, b) => a.release_date - b.release_date,
        render: (timestamp: number) => formatDate(timestamp),
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => {
          const [start, end] = String(selectedKeys[0])?.split("-") || [];
          const rangeValue =
            start && end ? [dayjs(Number(start)), dayjs(Number(end))] : null;

          const handleRangeChange = (dates: any) => {
            if (dates && dates[0] && dates[1]) {
              setSelectedKeys([`${dates[0].valueOf()}-${dates[1].valueOf()}`]);
            } else {
              setSelectedKeys([]);
            }
            confirm();
          };

          return (
            <div style={{ padding: 8, width: 250 }}>
              <RangePicker
                value={rangeValue as any}
                onChange={handleRangeChange}
                placeholder={["起始日期", "结束日期"]}
                presets={rangePickerPresets as any}
              />
            </div>
          );
        },
        onFilter: (value, record) => {
          if (!value) return true;
          const [start, end] = (value as string).split("-").map(Number);
          if (!start || !end) return true;
          const release_date = record.release_date;
          return release_date >= start && release_date <= end;
        },
        filterIcon: (filtered: boolean) => (
          <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
      },
      {
        title: "文件大小",
        dataIndex: "file_size",
        key: "file_size",
        width: 110,
        sorter: (a, b) => a.file_size - b.file_size,
        render: (size: number) => formatFileSize(size),
        filterIcon: (filtered: boolean) => (
          <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
      },
      {
        title: "Review",
        dataIndex: "review",
        key: "review",
        width: 100,
        render: (review: string | undefined, record) => (
          <Tag
            color={
              review === "reviewed"
                ? "green"
                : review === "unnice"
                  ? "red"
                  : "default"
            }
            onClick={() => handleReviewEdit(record)}
            style={{ cursor: "pointer" }}
          >
            <Space>
              {review === "reviewed"
                ? "已阅"
                : review === "unnice"
                  ? "不佳"
                  : "未标记"}
              <EditOutlined />
            </Space>
          </Tag>
        ),
        filters: [
          { text: "未标记", value: "unreview" },
          { text: "已阅", value: "reviewed" },
          { text: "不佳", value: "unnice" },
        ],
        onFilter: (value, record) => {
          if (value === "unreview") {
            return record.review === undefined || record.review === "unreview";
          }
          return record.review === value;
        },
        filterMultiple: false,
      },
    ];
  }, [data, handleReviewEdit]);

  return (
    <div className="movie-table-container">
      {buttonContainerRef.current &&
        ReactDOM.createPortal(
          <Tooltip title="卡片视图">
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => setShowCardModal(true)}
            ></Button>
          </Tooltip>,
          buttonContainerRef.current,
        )}
      <Image.PreviewGroup>
        <Table
          columns={columns}
          dataSource={movieList}
          rowKey="id"
          pagination={paginationConfig}
          scroll={{ x: "100%", y: "calc(100vh - 160px)" }}
          bordered
          size="middle"
          loading={loading}
          onChange={(pagination, _, __, extra) => {
            const { current, pageSize } = pagination;
            if (!current || !pageSize) return;
            setCurrentPageData(
              extra.currentDataSource.slice(
                (current - 1) * pageSize,
                current * pageSize,
              ),
            );
          }}
        />
      </Image.PreviewGroup>
      {showCardModal ? (
        <MovieCardListModal
          currentPageData={currentPageData}
          otherData={data}
          visible={showCardModal}
          onCancel={() => setShowCardModal(false)}
        />
      ) : null}
    </div>
  );
}
