import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-gray-800/80 text-gray-300 border-gray-700/50",
  accent: "bg-indigo-500/12 text-indigo-300 border-indigo-500/25",
  success: "bg-green-500/12 text-green-400 border-green-500/25",
  warning: "bg-yellow-400/12 text-yellow-400 border-yellow-400/25",
  danger: "bg-red-500/12 text-red-400 border-red-500/25",
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
