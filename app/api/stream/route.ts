import { promises as fsPromises, createReadStream } from 'fs';
import { normalize, resolve } from 'path';
import { cookies } from 'next/headers';
import { validateToken } from '../login/auth';

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
    mpeg: 'video/mpeg',
    mpg: 'video/mpeg',
    ts: 'video/mp2t',
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token || !validateToken(token)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');
  
  if (!filePath) {
    return new Response(JSON.stringify({ error: 'Path parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const fullPath = normalize(filePath);
  const resolvedPath = resolve(fullPath);
  
  if (resolvedPath.includes('..')) {
    return new Response(JSON.stringify({ error: 'Invalid path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const fileStat = await fsPromises.stat(resolvedPath);
    
    if (!fileStat.isFile()) {
      return new Response(JSON.stringify({ error: 'Not a file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const fileSize = fileStat.size;
    const range = request.headers.get('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      
      const stream = createReadStream(resolvedPath, { start, end });
      
      const headers = new Headers({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': getContentType(resolvedPath),
        'Cache-Control': 'no-cache',
      });
      
      return new Response(stream as unknown as BodyInit, {
        status: 206,
        headers,
      });
    } else {
      const stream = createReadStream(resolvedPath);
      
      const headers = new Headers({
        'Content-Length': fileSize.toString(),
        'Content-Type': getContentType(resolvedPath),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });
      
      return new Response(stream as unknown as BodyInit, {
        status: 200,
        headers,
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'File not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
