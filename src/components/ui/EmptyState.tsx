import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon, title, description, action, onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 bg-gray-900/40 py-16 px-6 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-gray-800 bg-gray-900 text-gray-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-xs text-[13px] text-gray-500">{description}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          {action}
        </button>
      )}
    </div>
  );
}
