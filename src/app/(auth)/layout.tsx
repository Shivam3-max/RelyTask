import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-950 px-4 py-10">
      {/* Ambient background — a single quiet glow + hairline grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 32rem at 50% -8rem, rgba(91,99,235,0.16), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(50rem_28rem_at_50%_0,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff0a 1px, transparent 1px), linear-gradient(90deg, #ffffff0a 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative w-full max-w-[400px] animate-rt-fade-up">
        <Link href="/login" className="mb-7 flex items-center justify-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            R
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">RELYTASK</span>
        </Link>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-7 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-sm">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          RELYTASK · Operations platform
        </p>
      </div>
    </div>
  );
}
