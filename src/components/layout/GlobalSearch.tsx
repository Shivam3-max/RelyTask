"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Search, CheckSquare, FolderOpen, UserCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Results = {
  tasks: { id: string; title: string; status: string; project?: { name: string; client: { name: string } } }[];
  projects: { id: string; name: string; client: { name: string } }[];
  clients: { id: string; name: string; companyName?: string }[];
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.length < 2) { setResults(null); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/search?q=${encodeURIComponent(value)}`);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function navigate(path: string) {
    router.push(path);
    setOpen(false);
    setQuery("");
    setResults(null);
  }

  const hasResults = results && (results.tasks.length + results.projects.length + results.clients.length) > 0;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        aria-label="Open search"
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-500 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
      >
        <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center pt-[15vh] z-[200] px-4" role="dialog" aria-modal="true" aria-label="Search">
          <div ref={ref} className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
              <Search className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="Search tasks, projects, clients..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setResults(null); }} aria-label="Clear search" className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">Searching...</div>
              )}

              {!loading && query.length >= 2 && !hasResults && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">No results for "{query}"</div>
              )}

              {!loading && hasResults && (
                <div className="divide-y divide-gray-800">
                  {results!.tasks.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Tasks</p>
                      {results!.tasks.map((t) => (
                        <button key={t.id} onClick={() => navigate(`/tasks?task=${t.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors text-left">
                          <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{t.title}</p>
                            {t.project && <p className="text-xs text-gray-500">{t.project.client.name} · {t.project.name}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.projects.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Projects</p>
                      {results!.projects.map((p) => (
                        <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors text-left">
                          <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
                          <div>
                            <p className="text-sm text-white">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.client.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.clients.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Clients</p>
                      {results!.clients.map((c) => (
                        <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors text-left">
                          <UserCircle className="w-4 h-4 text-purple-400 shrink-0" aria-hidden="true" />
                          <div>
                            <p className="text-sm text-white">{c.name}</p>
                            {c.companyName && <p className="text-xs text-gray-500">{c.companyName}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!query && (
                <div className="px-4 py-6 text-center text-xs text-gray-600">
                  Start typing to search across all tasks, projects and clients
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
