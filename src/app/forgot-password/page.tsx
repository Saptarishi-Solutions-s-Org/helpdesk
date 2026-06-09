"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema } from "@/lib/validators/forgot-password";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: form.get("email") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid email");
      return;
    }
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setLoading(false);
    toast.success("If the email exists, a reset link has been sent");
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
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white px-8 py-10 shadow-sm"
        >
          <div className="mb-8">
            <h1 className="mb-1 text-xl font-bold text-gray-900">
              Forgot password
            </h1>
            <p className="text-sm text-gray-500">
              Enter your email to receive reset link
            </p>
          </div>
          <div className="space-y-5">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Email address
              </Label>
              <Input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="rounded-xl border-gray-200 text-sm focus-visible:ring-indigo-400"
              />
            </div>
            <Button
              className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
