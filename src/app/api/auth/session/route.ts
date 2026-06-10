import { NextResponse } from "next/server";
import { getSessionUser, refreshSession } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (user) await refreshSession(user);
  return NextResponse.json({ user });
}
