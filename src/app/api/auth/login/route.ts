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

  if (!user) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 });
  }

  if (user.status !== "ACTIVE" || (user.role === "CLIENT" && user.organizationStatus !== "ACTIVE")) {
    return NextResponse.json(
      { message: "Your account is inactive. Please contact admin." },
      { status: 403 },
    );
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json({ message: "Wrong password" }, { status: 401 });
  }

  if (user.mustChangePassword) {
    return NextResponse.json({ message: "Password setup required" }, { status: 403 });
  }

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "ADMIN" | "CLIENT",
    organizationId: user.organizationId,
    sessionVersion: user.sessionVersion ?? 1,
  });

  return NextResponse.json({ success: true });
}
