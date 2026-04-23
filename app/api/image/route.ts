import { promises as fsPromises, createReadStream } from "fs";
import { cookies } from "next/headers";
import { validateToken } from "../login/auth";
import { getAbsPath } from "../utils/file";

function getContentType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    tiff: "image/tiff",
    svg: "image/svg+xml",
  };

  return mimeTypes[ext || ""] || "application/octet-stream";
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token || !validateToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const filePath = decodeURIComponent(url.searchParams.get("path") || "");

  if (!filePath) {
    return new Response(
      JSON.stringify({ error: "path parameter is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const imageDir = "data\\imgs";

  if (!filePath.startsWith(imageDir)) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const fullPath = getAbsPath(".\\" + filePath);
    const fileStat = await fsPromises.stat(fullPath);

    if (!fileStat.isFile()) {
      return new Response(JSON.stringify({ error: "Not a file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileSize = fileStat.size;
    const stream = createReadStream(fullPath);

    const headers = new Headers({
      "Content-Length": fileSize.toString(),
      "Content-Type": getContentType(fullPath),
      "Cache-Control": "public, max-age=2592000",
    });

    return new Response(stream as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
