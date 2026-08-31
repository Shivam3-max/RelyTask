/* eslint-disable @next/next/no-img-element */
const BRAND_GRADIENT =
  "linear-gradient(150deg, #2f63d4 0%, #4c8dff 45%, #8ec5ff 100%)";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="grid w-full max-w-[900px] animate-rt-fade-up overflow-hidden rounded-2xl border border-gray-800 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:grid-cols-2">
        {/* Brand panel */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-8 text-white sm:flex"
          style={{ background: BRAND_GRADIENT }}
        >
          {/* organic shapes */}
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 560">
            <path d="M-40 120C60 40 140 90 160 180s-40 170 40 230 130 60 130 160H-40z" fill="rgba(255,255,255,0.12)" />
            <path d="M120 -40c120 0 160 120 120 220s-160 120-120 260 200 100 260 180H120z" fill="rgba(255,255,255,0.08)" />
            <circle cx="330" cy="90" r="120" fill="rgba(255,255,255,0.10)" />
          </svg>

          <span className="relative inline-flex w-fit rounded-xl bg-white px-4 py-3 shadow-lg">
            <img src="/Logo.png" alt="RELYTASK" className="h-8 w-auto" />
          </span>

          <div className="relative">
            <p className="text-[27px] font-semibold leading-tight">
              The best way<br />to run delivery
            </p>
            <p className="mt-2.5 max-w-[16rem] text-sm text-white/80">
              Projects, tasks, SOPs and client approvals — one workspace.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="bg-gray-900 px-7 py-9 sm:px-9 sm:py-10">
          <div className="mb-7 flex items-center sm:hidden">
            <img src="/Logo.png" alt="RELYTASK" className="h-8 w-auto" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
