import { cookies } from "next/headers";
import { validateToken } from "../../login/auth";
import { currentScan } from "../current";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token || !validateToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (currentScan.current) {
    currentScan.current.scanController.abort();
    currentScan.current = null;
  }

  return Response.json({ success: true, message: "Scan stopped" });
}

export const dynamic = "force-dynamic";
