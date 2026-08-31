"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("That email and password don't match.");
      setLoading(false);
    } else {
      router.push("/portal");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="grid w-full max-w-[900px] animate-rt-fade-up overflow-hidden rounded-2xl border border-gray-800 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:grid-cols-2">
        {/* Brand panel */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-8 text-white sm:flex"
          style={{ background: "linear-gradient(150deg, #2f63d4 0%, #4c8dff 45%, #8ec5ff 100%)" }}
        >
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 560">
            <path d="M-40 120C60 40 140 90 160 180s-40 170 40 230 130 60 130 160H-40z" fill="rgba(255,255,255,0.12)" />
            <path d="M120 -40c120 0 160 120 120 220s-160 120-120 260 200 100 260 180H120z" fill="rgba(255,255,255,0.08)" />
            <circle cx="330" cy="90" r="120" fill="rgba(255,255,255,0.10)" />
          </svg>
          <span className="relative inline-flex w-fit rounded-xl bg-white px-4 py-3 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.png" alt="RELYTASK" className="h-8 w-auto" />
          </span>
          <div className="relative">
            <p className="text-[27px] font-semibold leading-tight">Your delivery,<br />in one view</p>
            <p className="mt-2.5 max-w-[16rem] text-sm text-white/80">Track projects, review work, and approve deliverables.</p>
          </div>
        </div>

        {/* Form panel */}
        <div className="bg-gray-900 px-7 py-9 sm:px-9 sm:py-10">
          <div className="mb-7 flex items-center sm:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.png" alt="RELYTASK" className="h-8 w-auto" />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-white">Client sign in</h1>
          <p className="mt-1 text-sm text-gray-500">See your projects, approvals and reports.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </Field>
            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-xs text-gray-600">
            On the team?{" "}
            <Link href="/login" className="text-gray-400 transition-colors hover:text-white">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
