import { cookies } from "next/headers";
import { validateToken } from "../login/auth";
import { db } from "./db";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token || !validateToken(token)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const dbString = JSON.stringify(await db.getFullData());

    return Response.json({ dbString: dbString });
  } catch {
    return Response.json(
      { error: "Failed to fetch database data" },
      { status: 500 },
    );
  }
}
