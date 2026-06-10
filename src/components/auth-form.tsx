"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validators/login";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem("helpdeskLoginEmail");
    if (savedEmail) {
      queueMicrotask(() => {
        setEmail(savedEmail);
        setRemember(true);
      });
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setLoginError(parsed.error.issues[0]?.message || "Invalid login details");
      return;
    }

    setLoginError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      setLoginError(result.message || "Login failed");
      return;
    }
    if (remember) {
      localStorage.setItem("helpdeskLoginEmail", email);
    } else {
      localStorage.removeItem("helpdeskLoginEmail");
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {loginError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loginError}</span>
        </div>
      ) : null}
      <div>
        <label className="mb-2 block text-xs font-bold text-[#34302c]">
          Email address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9286]" />
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@saptarishi.tech"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setLoginError("");
            }}
            disabled={loading}
            className="h-12 rounded-2xl border-[#ddd6cc] bg-[#fffdf9] pl-10 text-sm focus-visible:ring-[#8B5CF6]"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-xs font-bold text-[#34302c]">Password</label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-[#6f45c7] transition-colors hover:text-[#4f2a9f]"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9286]" />
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setLoginError("");
            }}
            disabled={loading}
            className="h-12 rounded-2xl border-[#ddd6cc] bg-[#fffdf9] pl-10 pr-11 text-sm focus-visible:ring-[#8B5CF6]"
          />
          <button
            type="button"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9b9286] transition-colors hover:text-[#1a1a1a]"
            onClick={() => setShowPassword((value) => !value)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-[#6c665f]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-[#cfc5b8] accent-[#8B5CF6]"
          />
          Remember me
        </label>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6c665f]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#2D6A4F]" />
          Protected
        </span>
      </div>

      <Button
        className="h-12 w-full rounded-full bg-[#1a1a1a] text-sm font-bold text-white shadow-[0_14px_32px_rgba(26,26,26,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#111]"
        disabled={!email || !password || loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Signing in...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Sign in to Helpdesk
            <ArrowRight size={16} />
          </span>
        )}
      </Button>
    </form>
  );
}

export function TokenPasswordForm({
  endpoint,
  token,
  label,
}: {
  endpoint: string;
  token: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.get("password") }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error((await res.json()).message || "Unable to update password");
      return;
    }
    toast.success("Password updated");
    router.push("/login");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input name="password" type="password" minLength={8} required />
      </div>
      <Button className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Save password"}
      </Button>
    </form>
  );
}
