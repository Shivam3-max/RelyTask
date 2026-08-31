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
      <div className="grid w-full max-w-[880px] animate-rt-fade-up overflow-hidden rounded-2xl border border-gray-800 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] md:grid-cols-2">
        {/* Brand panel */}
        <div className="rt-gradient-brand relative hidden flex-col justify-between overflow-hidden p-9 md:flex">
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[#8ec5ff]/40 blur-3xl" />
          <span className="relative inline-flex w-fit rounded-xl bg-white/95 px-3.5 py-2.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.png" alt="RELYTASK" className="h-7 w-auto" />
          </span>
          <div className="relative">
            <p className="text-[26px] font-semibold leading-tight text-white">Your delivery,<br />in one view</p>
            <p className="mt-2.5 max-w-[15rem] text-sm text-white/75">Track projects, review work, and approve deliverables.</p>
          </div>
        </div>

        {/* Form panel */}
        <div className="bg-gray-900 px-7 py-9 sm:px-10">
          <div className="mb-7 flex items-center gap-2 md:hidden">
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
