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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-950 px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60rem 32rem at 50% -8rem, rgba(91,99,235,0.16), transparent 70%)" }}
      />
      <div className="relative w-full max-w-[400px] animate-rt-fade-up">
        <div className="mb-7 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="RELYTASK" className="h-9 w-auto" />
          <span className="text-sm font-medium text-gray-500">Portal</span>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-7 backdrop-blur-sm">
          <h1 className="text-lg font-semibold tracking-tight text-white">Client sign in</h1>
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
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          On the team?{" "}
          <Link href="/login" className="text-gray-400 transition-colors hover:text-white">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
