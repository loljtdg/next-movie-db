import { spawn } from "child_process";
import { cookies } from "next/headers";
import { validateToken } from "../login/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token || !validateToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { path, type } = body;

    if (!path) {
      return new Response(
        JSON.stringify({ error: "path parameter is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (path.includes("..")) {
      return new Response(
        JSON.stringify({ error: "Path traversal not allowed" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    let command: string;
    let args: string[];

    if (type === "folder") {
      command = "explorer.exe";
      args = ["/select", `"${path}"`];
    } else {
      command = "explorer.exe";
      args = [path];
    }

    const child = spawn(command, args, {
      detached: true,
      stdio: "pipe",
      shell: true,
    });

    child.unref();

    return Response.json({ success: true, message: "Command executed" });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to execute command" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
