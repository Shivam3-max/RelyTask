/* eslint-disable @next/next/no-img-element */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="grid w-full max-w-[880px] animate-rt-fade-up overflow-hidden rounded-2xl border border-gray-800 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] md:grid-cols-2">
        {/* Brand panel */}
        <div className="rt-gradient-brand relative hidden flex-col justify-between overflow-hidden p-9 md:flex">
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[#8ec5ff]/40 blur-3xl" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light"
            style={{ background: "radial-gradient(60% 40% at 20% 20%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(50% 50% at 90% 80%, rgba(255,255,255,0.25), transparent 60%)" }}
          />

          <span className="relative inline-flex w-fit rounded-xl bg-white/95 px-3.5 py-2.5 shadow-sm">
            <img src="/Logo.png" alt="RELYTASK" className="h-7 w-auto" />
          </span>

          <div className="relative">
            <p className="text-[26px] font-semibold leading-tight text-white">
              The best way<br />to run delivery
            </p>
            <p className="mt-2.5 max-w-[15rem] text-sm text-white/75">
              Projects, tasks, SOPs and client approvals — one workspace.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="bg-gray-900 px-7 py-9 sm:px-10">
          <div className="mb-7 flex items-center gap-2.5 md:hidden">
            <img src="/Logo.png" alt="RELYTASK" className="h-8 w-auto" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
