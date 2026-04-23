import { cookies } from "next/headers";
import { validateToken } from "../login/auth";
import { loadConfig, saveConfig } from "./file";
import { PutConfigBody } from "./types";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token || !validateToken(token)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const config = await loadConfig();

  return Response.json({
    config,
  });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token || !validateToken(token)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: PutConfigBody = await request.json();

    const currentConfig = await loadConfig();

    if (body.scanPaths !== undefined) {
      if (!Array.isArray(body.scanPaths)) {
        return Response.json(
          { error: "Invalid scanPaths format" },
          { status: 400 },
        );
      }
      currentConfig.scanPaths = body.scanPaths;
    }

    if (body.webHost !== undefined) {
      if (typeof body.webHost !== "string") {
        return Response.json(
          { error: "Invalid webHost format" },
          { status: 400 },
        );
      }
      currentConfig.webHost = body.webHost;
    }

    await saveConfig(currentConfig);

    return Response.json({
      config: currentConfig,
    });
  } catch {
    return Response.json({ error: "Failed to update config" }, { status: 500 });
  }
}
