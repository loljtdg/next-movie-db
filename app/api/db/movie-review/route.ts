import { cookies } from "next/headers";
import { validateToken } from "../../login/auth";
import { db } from "../db";

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
    const { id, review } = await request.json();
    
    if (!id) {
      return Response.json({ error: "Movie id is required" }, { status: 400 });
    }
    
    const movie = db.updateMovie(id, { review });
    
    if (!movie) {
      return Response.json({ error: "Movie not found" }, { status: 404 });
    }
    
    return Response.json({ success: true, movie });
  } catch {
    return Response.json(
      { error: "Failed to update movie" },
      { status: 500 },
    );
  }
}
