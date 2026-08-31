import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "rt-gradient text-white shadow-[0_1px_0_0_rgba(255,255,255,0.14)_inset,0_6px_16px_-6px_rgba(61,124,245,0.6)] hover:brightness-110",
  secondary:
    "bg-gray-800/70 text-gray-100 hover:bg-gray-800 border border-gray-700/60",
  ghost: "text-gray-300 hover:text-white hover:bg-gray-800/60",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",
        "transition-colors focus-visible:outline-none",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});
