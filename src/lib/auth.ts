import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { organizations, roles, users } from "@/db/schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "srs_helpdesk_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 4;
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-helpdesk-secret",
);

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT" | "DEVELOPER" | "QUALITY ANALYST";
  organizationId: string | null;
  sessionVersion: number;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function refreshSession(user: SessionUser) {
  await createSession(user);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as SessionUser;
    const [current] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        organizationId: users.organizationId,
        sessionVersion: users.sessionVersion,
        role: roles.roleName,
        organizationStatus: organizations.status,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, payload.id))
      .limit(1);

    if (
      !current ||
      current.status !== "ACTIVE" ||
      current.sessionVersion !== payload.sessionVersion ||
      (current.role === "CLIENT" && current.organizationStatus !== "ACTIVE")
    ) {
      await clearSession();
      return null;
    }

    return {
      id: current.id,
      name: current.name,
      email: current.email,
      role: current.role as "ADMIN" | "CLIENT" | "DEVELOPER" | "QUALITY ANALYST",
      organizationId: current.organizationId,
      sessionVersion: current.sessionVersion,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== "ADMIN") throw new Error("FORBIDDEN");
  return session;
}

export async function getLoginUser(email: string) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      status: users.status,
      organizationId: users.organizationId,
      sessionVersion: users.sessionVersion,
      organizationStatus: organizations.status,
      role: roles.roleName,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return rows[0] ?? null;
}
