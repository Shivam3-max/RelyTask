import Link from "next/link";
import { Megaphone, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
        <Megaphone className="w-6 h-6 text-indigo-400" />
      </div>
      <h1 className="text-6xl font-bold text-white mb-3">404</h1>
      <p className="text-lg font-medium text-gray-300 mb-2">Page not found</p>
      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-onblue text-sm font-medium rounded-lg transition-colors"
      >
        <Home className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
