/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-950 px-4 py-10">
      {/* Soft Atlassian-blue wash at the top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(56rem 30rem at 50% -10rem, rgba(12,102,228,0.10), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[400px] animate-rt-fade-up">
        <Link href="/login" className="mb-7 flex items-center justify-center gap-2.5">
          <img src="/Logo.png" alt="RELYTASK" className="h-9 w-auto" />
        </Link>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-7 shadow-[0_1px_1px_rgba(9,30,66,0.08),0_8px_24px_-8px_rgba(9,30,66,0.12)]">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">RELYTASK · Operations platform</p>
      </div>
    </div>
  );
}
