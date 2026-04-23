"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  EditOutlined,
  FolderAddOutlined,
  SaveOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Button,
  Input,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { type LogMessage } from "../../api/scan/do-scan/types";
import dayjs from "dayjs";
import axios from "../../lib/axios";

export function ScanPane() {
  const [running, setRunning] = useState(false);
  const [modalShow, setModalShow] = useState(false);

  const [host, setHost] = useState("");
  const [editHost, setEditHost] = useState(false);

  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [editPaths, setEditPaths] = useState(false);

  const [addPath, setAddPath] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  const [logs, setLogs] = useState<LogMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const eventSourceRef = useRef<EventSource | null>(null);

  const loadConfig = async () => {
    try {
      const response = await axios.get("/api/config");
      const { config } = response.data;
      setHost(config.webHost);
      setFilePaths(config.scanPaths || []);
    } catch (error) {
      message.error("加载配置失败");
    }
  };

  const saveHost = async () => {
    try {
      await axios.put("/api/config", { webHost: host });
      message.success("HOST 保存成功");
    } catch (error) {
      message.error("保存 HOST 失败");
    }
  };

  const savePaths = async () => {
    try {
      await axios.put("/api/config", { scanPaths: filePaths });
      message.success("路径保存成功");
    } catch (error) {
      message.error("保存路径失败");
    }
  };

  const handleSelectFolder = () => {
    setAddPath(true);
  };

  const handleClickScan = async () => {
    setRunning(true);
    setLogs([]);

    try {
      const eventSource = new EventSource("/api/scan/start");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        if (event.data === "[DONE]") {
          eventSource.close();
          setRunning(false);
          eventSourceRef.current = null;
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.type === "log" && data.message) {
            setLogs((pre) => [...pre, data.message]);
          }
        } catch {
          console.log("Raw message:", event.data);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setRunning(false);
        eventSourceRef.current = null;
      };
    } catch (error) {
      setRunning(false);
      message.error("启动扫描失败");
    }
  };

  const handleClickStop = async () => {
    try {
      await axios.post("/api/scan/stop");
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setRunning(false);
    } catch (error) {
      message.error("停止扫描失败");
    }
  };



  useEffect(() => {
    loadConfig();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (isAtBottom.current) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current?.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs]);

  return (
    <>
      <Tooltip title="扫描文件">
        <Button
          icon={
            <div className={"scan-icon"}>
              <span>📚</span>
              {running ? <SyncOutlined spin className="loading-icon" /> : null}
            </div>
          }
          onClick={() => setModalShow(true)}
        ></Button>
      </Tooltip>
      <Modal
        width={"80%"}
        open={modalShow}
        onCancel={() => setModalShow(false)}
        title={running ? "正在扫描文件..." : "扫描文件"}
        footer={null}
      >
        <div className="scan-modal-content">
          <Space style={{ marginBottom: 6 }}>
            <Typography.Text type="secondary" strong>
              HOST:
            </Typography.Text>
            <Input
              style={{ width: 200 }}
              size="small"
              disabled={!editHost}
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            <Tooltip title={editHost ? "保存" : "编辑"}>
              <Button
                size="small"
                icon={editHost ? <SaveOutlined /> : <EditOutlined />}
                onClick={() =>
                  setEditHost((pre) => {
                    if (pre) {
                      saveHost();
                    }
                    return !pre;
                  })
                }
              />
            </Tooltip>
          </Space>
          <Space wrap style={{ marginBottom: 6 }}>
            <Typography.Text type="secondary" strong>
              PATHS:
            </Typography.Text>
            {filePaths.map((p) => (
              <Tag
                key={p}
                closable={editPaths}
                onClose={() => {
                  setFilePaths((pre) => pre.filter((item) => item !== p));
                }}
              >
                {p}
              </Tag>
            ))}
            {editPaths ? (
              <Tooltip title="添加文件夹">
                <Button
                  size="small"
                  icon={<FolderAddOutlined />}
                  onClick={handleSelectFolder}
                ></Button>
              </Tooltip>
            ) : null}
            <Tooltip title={editPaths ? "保存" : "编辑"}>
              <Button
                size="small"
                icon={editPaths ? <SaveOutlined /> : <EditOutlined />}
                onClick={() =>
                  setEditPaths((pre) => {
                    if (pre) {
                      savePaths();
                    }
                    return !pre;
                  })
                }
              />
            </Tooltip>
          </Space>
          <Space>
            <Button
              disabled={!filePaths.length || running}
              type="primary"
              onClick={handleClickScan}
            >
              开始扫描
            </Button>
            <Button disabled={!running} onClick={handleClickStop}>
              停止扫描
            </Button>
          </Space>
          <div
            className="scan-modal-logs"
            ref={scrollRef}
            onScroll={(e) => {
              const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
              isAtBottom.current = scrollTop + clientHeight >= scrollHeight - 5;
            }}
          >
            {logs.map((log, idx) => (
              <div key={idx}>
                <Space>
                  <Typography.Text>
                    {dayjs(log.date).format("YYYY-MM-DDTHH:mm:ss[Z]")}
                  </Typography.Text>
                  <Typography.Text>{log.level}</Typography.Text>
                </Space>
                <div style={{ marginLeft: 50 }}>
                  <Typography.Text>{JSON.stringify(log.data)}</Typography.Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        title="输入文件夹路径"
        open={addPath}
        onOk={() => {
          if (currentPath.trim()) {
            setFilePaths((pre) => [...pre, currentPath.trim()]);
            setCurrentPath("");
          }
          setAddPath(false)
        }}
        onCancel={() => setAddPath(false)}
        okButtonProps={{ disabled: !currentPath.trim() }}
      >
        <Input
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          placeholder="请输入文件夹路径"
        />
      </Modal>
    </>
  );
}
