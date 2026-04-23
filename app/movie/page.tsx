"use client";

import { useState, useEffect } from "react";
import { Typography, message } from "antd";
import { useRouter } from "next/navigation";

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    flv: "video/x-flv",
    wmv: "video/x-ms-wmv",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    ts: "video/mp2t",
  };

  return mimeTypes[ext || ""] || "video/mp4";
}

export default function MoviePage() {
  const router = useRouter();
  const [filePath, setFilePath] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filePath = params.get("path") || "";
    setFilePath(filePath);
    const videoUrl = `/api/stream?path=${filePath}`;
    const checkVideoAccess = async () => {
      try {
        const response = await fetch(videoUrl, { method: "HEAD" });
        if (response.status === 401) {
          message.error("请先登录");
          setTimeout(() => {
            router.push(
              `/login?redirect=${encodeURIComponent(window.location.href)}`,
            );
          }, 2000);
          return;
        }
      } catch (error) {
        message.error(`加载失败: ${error}`);
      }
    };

    checkVideoAccess();
  }, [router]);

  const decodedPath = decodeURIComponent(filePath);
  const videoUrl = `/api/stream?path=${filePath}`;
  const displayName = decodedPath.split(/[\\/]/).pop() || decodedPath;

  return (
    <div className="page">
      <div className="flex-shrink-0">
        <Typography.Title level={3}>{displayName}</Typography.Title>
        <Typography.Text>{decodedPath}</Typography.Text>
      </div>
      {filePath ? (
        <video controls className="w-full h-auto bg-black my-6">
          <source src={videoUrl} type={getMimeType(filePath)} />
          您的浏览器不支持视频播放。
        </video>
      ) : null}
    </div>
  );
}
