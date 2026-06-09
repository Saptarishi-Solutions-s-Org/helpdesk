import { NextResponse } from "next/server";
import { createSession, getLoginUser, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/login";

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const user = await getLoginUser(email.toLowerCase());

  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  if (user.mustChangePassword) {
    return NextResponse.json({ message: "Password setup required" }, { status: 403 });
  }

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "ADMIN" | "USER",
    organizationId: user.organizationId,
  });

  return NextResponse.json({ success: true });
}
