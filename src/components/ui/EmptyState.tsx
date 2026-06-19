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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-600" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}
