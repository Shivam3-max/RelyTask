import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-white " +
  "placeholder:text-gray-600 transition-colors " +
  "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  }
);

export function Field({
  label,
  htmlFor,
  hint,
  children,
  action,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-xs font-medium text-gray-400">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-600">{hint}</p>}
    </div>
  );
}
