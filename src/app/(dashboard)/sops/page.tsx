"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { CATEGORY_LABEL_FULL } from "@/lib/constants";
import { usePageTitle } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Input";

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
    <div className="space-y-5">
      <PageHeader title="SOP builder" description="Standard operating procedures for every service type">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New SOP</span>
        </Button>
      </PageHeader>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        <p className="text-xs text-gray-400">
          When a task is created with a matching category, its SOP checklist auto-loads as subtasks — so nothing gets missed.
        </p>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          Couldn&apos;t load SOPs. Try refreshing.
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
          <EmptyState
            icon={BookOpen}
            title="No SOPs yet"
            description="Create your first SOP to standardize a workflow."
            action="New SOP"
            onAction={() => setCreating(true)}
          />
        )}
      </div>

      {creating && (
        <Modal
          title="Create SOP"
          size="xl"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                size="sm"
                loading={create.isPending}
                disabled={!form.name || steps.some((s) => !s.title)}
                onClick={() => create.mutate({ ...form, steps })}
              >
                Save SOP
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-name" className="mb-1.5 block text-xs font-medium text-gray-400">SOP name <span className="text-gray-600">*</span></label>
              <input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Reels production workflow" />
            </div>
            <div>
              <label htmlFor="s-cat" className="mb-1.5 block text-xs font-medium text-gray-400">Category</label>
              <select id="s-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {Object.entries(CATEGORY_LABEL_FULL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400">Steps <span className="text-gray-600">*</span></label>
              <button onClick={addStep} className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white">
                <Plus className="h-3 w-3" /> Add step
              </button>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-2 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-500/15 text-[11px] font-semibold text-indigo-300">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <input value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)} className={inputClass} placeholder={`Step ${i + 1} title`} />
                    <input value={step.description ?? ""} onChange={(e) => updateStep(i, "description", e.target.value)} className={cn(inputClass, "text-xs")} placeholder="Optional details" />
                  </div>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`} className="mt-2 text-gray-600 transition-colors hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
