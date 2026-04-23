import { cookies } from "next/headers";
import { validateToken } from "../../login/auth";
import { NextResponse } from "next/server";
import { currentScan } from "../current";
import { doScan } from "../do-scan";
import { LogHook, scanLogger } from "../do-scan/log";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token || !validateToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (currentScan.current) {
    return NextResponse.json(
      { success: false, message: "Scan already running" },
      { status: 400 },
    );
  }

  const scanController = new AbortController();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const scanLoggerHook: LogHook = (message) => {
        const data = {
          type: "log",
          message: message,
        };
        if (currentScan.current) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        }
      };

      scanLogger.hooks.push(scanLoggerHook);

      doScan(scanController.signal).finally(() => {
        scanLogger.hooks = scanLogger.hooks.filter((h) => h !== scanLoggerHook);
        if (currentScan.current) {
          const data = {
            type: "end",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));

          currentScan.current = null;
          controller.close();
        }
      });

      currentScan.current = {
        scanController: scanController,
      };
    },
    cancel() {
      if (currentScan.current) {
        currentScan.current = null;
      }
    },
  });

  scanController.signal.addEventListener("abort", () => {
    stream.cancel();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}