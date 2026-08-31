import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-400 border-gray-800",
  accent: "bg-indigo-900 text-indigo-700 border-indigo-950",
  success: "bg-green-400/12 text-green-500 border-green-400/25",
  warning: "bg-yellow-400/12 text-yellow-400 border-yellow-400/30",
  danger: "bg-red-400/12 text-red-500 border-red-400/25",
  info: "bg-blue-400/12 text-blue-400 border-blue-400/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
