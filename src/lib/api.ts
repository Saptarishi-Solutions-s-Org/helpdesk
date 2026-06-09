import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  console.error(error);
  return NextResponse.json({ message: "Server error" }, { status: 500 });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
