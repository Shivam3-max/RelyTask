"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { CATEGORY_LABEL_FULL } from "@/lib/constants";
import { usePageTitle } from "@/lib/hooks";

type SopStep = { id?: string; title: string; description?: string; order: number };
type SopTemplate = {
  id: string; name: string; category: string;
  steps: SopStep[];
  createdAt: string;
};

const CATEGORY_COLOR: Record<string, string> = {
  VIDEO_EDITING: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  CLIENT_VIDEO_RECORDING: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  GRAPHIC_DESIGN: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  ADS_MANAGEMENT: "text-green-400 bg-green-500/10 border-green-500/20",
  SHOOT: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  CONTENT_WRITING: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  STRATEGY: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  REPORTING: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  OTHER: "text-gray-400 bg-gray-700 border-gray-600",
};

export default function SopsPage() {
  usePageTitle("SOP Builder");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "VIDEO_EDITING" });
  const [steps, setSteps] = useState<SopStep[]>([{ title: "", description: "", order: 1 }]);

  const { data: sops = [], isLoading, isError } = useQuery<SopTemplate[]>({
    queryKey: ["sops"],
    queryFn: () => axios.get("/api/sops").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: { name: string; category: string; steps: SopStep[] }) =>
      axios.post("/api/sops", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sops"] });
      setCreating(false);
      setForm({ name: "", category: "VIDEO_EDITING" });
      setSteps([{ title: "", description: "", order: 1 }]);
      toast("SOP created", "success");
    },
    onError: () => toast("Failed to create SOP", "error"),
  });

  function addStep() {
    setSteps((prev) => [...prev, { title: "", description: "", order: prev.length + 1 }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));
  }

  function updateStep(i: number, field: "title" | "description", value: string) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">SOP Builder</h1>
          <p className="text-sm text-gray-400 mt-1">Standard operating procedures for every service type</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New SOP</span>
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-300">How SOPs work</p>
            <p className="text-xs text-indigo-400/70 mt-0.5">
              When a task is created with a matching category, its SOP checklist auto-loads as subtasks.
              Your team follows the steps — nothing gets missed.
            </p>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-gray-500 text-sm">Loading...</p>}
      {isError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          Failed to load SOPs — try refreshing.
        </p>
      )}

      {/* SOP cards */}
      <div className="space-y-3">
        {sops.map((sop) => (
          <div key={sop.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === sop.id ? null : sop.id)}
              aria-expanded={expanded === sop.id}
              aria-controls={`sop-${sop.id}`}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${CATEGORY_COLOR[sop.category]}`}>
                  {CATEGORY_LABEL_FULL[sop.category]}
                </span>
                <span className="text-sm font-medium text-white">{sop.name}</span>
                <span className="text-xs text-gray-500">{sop.steps.length} steps</span>
              </div>
              {expanded === sop.id
                ? <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                : <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
              }
            </button>

            {expanded === sop.id && (
              <div id={`sop-${sop.id}`} className="border-t border-gray-800 px-5 py-4">
                <ol className="space-y-3">
                  {sop.steps.map((step, i) => (
                    <li key={step.id ?? i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{step.title}</p>
                        {step.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}

        {sops.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
            <BookOpen className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No SOPs yet</p>
            <p className="text-xs text-gray-600 mt-1">Create your first SOP to standardize your workflows</p>
          </div>
        )}
      </div>

      {/* Create SOP Modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-sop-title">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 id="create-sop-title" className="text-lg font-semibold text-white">Create SOP</h2>
              <button type="button" onClick={() => setCreating(false)} aria-label="Close" className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">SOP Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Reels Production Workflow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(CATEGORY_LABEL_FULL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-gray-400 font-medium">Steps *</label>
                  <button onClick={addStep} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                    <Plus className="w-3 h-3" />
                    Add step
                  </button>
                </div>
                <div className="space-y-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center shrink-0 font-bold mt-2">
                        {i + 1}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          value={step.title}
                          onChange={(e) => updateStep(i, "title", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`Step ${i + 1} title`}
                        />
                        <input
                          value={step.description ?? ""}
                          onChange={(e) => updateStep(i, "description", e.target.value)}
                          className="w-full px-3 py-1.5 bg-gray-800/60 border border-gray-700/50 rounded-lg text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Optional details"
                        />
                      </div>
                      {steps.length > 1 && (
                        <button type="button" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`} className="text-gray-600 hover:text-red-400 mt-2 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button
                type="button"
                onClick={() => create.mutate({ ...form, steps })}
                disabled={!form.name || steps.some((s) => !s.title) || create.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {create.isPending ? "Saving..." : "Save SOP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
