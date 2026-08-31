"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post("/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Something went wrong. Try again.")
        : "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-green-400" aria-hidden="true" />
        <h1 className="text-lg font-semibold tracking-tight text-white">Password updated</h1>
        <p className="mt-2 text-sm text-gray-500">Taking you to sign in…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto mb-4 h-10 w-10 text-red-400" aria-hidden="true" />
        <h1 className="text-lg font-semibold tracking-tight text-white">Link not valid</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
          This reset link is missing or malformed.
        </p>
        <Link href="/forgot-password" className="mt-5 inline-block text-sm text-gray-400 transition-colors hover:text-white">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-lg font-semibold tracking-tight text-white">Set a new password</h1>
      <p className="mt-1 text-sm text-gray-500">At least 8 characters.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="New password" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="pr-10"
              placeholder="Min 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm password" htmlFor="confirm">
          <Input
            id="confirm"
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Repeat password"
          />
        </Field>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} disabled={!password || !confirm} className="w-full">
          Reset password
        </Button>
      </form>

      <Link href="/login" className="mt-5 inline-block text-sm text-gray-500 transition-colors hover:text-gray-300">
        Back to sign in
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
