"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordPolicyNote } from "@/components/password-policy-note";
import { resetPasswordSchema } from "@/lib/validators/reset-password";

export function PasswordTokenPage({
  endpoint,
  title,
  subtitle,
}: {
  endpoint: string;
  title: string;
  subtitle: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setMessage("");

    if (!token) {
      setError("Invalid or missing link.");
      return;
    }
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid password.");
      return;
    }

    setLoading(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Invalid or expired link.");
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Password updated successfully.");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-[var(--font-poppins)]">
      <div className="flex items-center justify-between px-6 py-4">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          <ArrowLeft size={15} />
          Back to login
        </Link>
        <Image
          src="/saptarishi.png"
          alt="Saptarishi Solutions"
          width={100}
          height={30}
          priority
          className="hidden md:block"
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-gray-100 bg-white px-8 py-10 shadow-sm">
            <div className="mb-8">
              <h1 className="mb-1 text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>

            {message && (
              <div className="mb-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-700">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <PasswordPolicyNote />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="rounded-xl border-gray-200 pr-10 text-sm focus-visible:ring-indigo-400"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm password"
                    className="rounded-xl border-gray-200 pr-10 text-sm focus-visible:ring-indigo-400"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <Button
                onClick={submit}
                disabled={loading}
                className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold hover:bg-indigo-700"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            This portal is for registered SRS Helpdesk users only.
          </p>
        </div>
      </div>
    </div>
  );
}
