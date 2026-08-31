import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded border border-gray-700 bg-gray-100 px-3 py-1.5 text-sm text-white " +
  "placeholder:text-gray-600 transition-colors " +
  "hover:bg-gray-200 " +
  "focus:border-indigo-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 " +
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
