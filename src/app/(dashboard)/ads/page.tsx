"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { TrendingUp, DollarSign, MousePointer, Eye, Target, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { PLATFORM_COLOR } from "@/lib/constants";
import { usePageTitle } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { inputClass } from "@/components/ui/Input";

const PAGE_SIZE = 15;

type AdMetric = {
  id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas?: number;
  ctr?: number;
  adAccount: { platform: string; accountName: string; client: { name: string } };
};

type Client = { id: string; name: string };

const EMPTY_FORM = {
  clientId: "", platform: "META", accountName: "",
  date: new Date().toISOString().split("T")[0],
  spend: "", impressions: "", clicks: "", conversions: "",
};

export default function AdsPage() {
  usePageTitle("Ad Tracker");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);

  const { data: metrics = [], isError: metricsError } = useQuery<AdMetric[]>({
    queryKey: ["ad-metrics"],
    queryFn: () => axios.get("/api/ads/metrics").then((r) => r.data),
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients-list"],
    queryFn: () => axios.get("/api/clients").then((r) => r.data),
  });

  const addMetric = useMutation({
    mutationFn: () => axios.post("/api/ads/metrics", {
      clientId: form.clientId,
      platform: form.platform,
      accountName: form.accountName || `${form.platform} Account`,
      date: form.date,
      spend: parseFloat(form.spend) || 0,
      impressions: parseInt(form.impressions) || 0,
      clicks: parseInt(form.clicks) || 0,
      conversions: parseInt(form.conversions) || 0,
    }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad-metrics"] });
      setAdding(false);
      setForm(EMPTY_FORM);
      toast("Metrics added", "success");
    },
    onError: () => toast("Failed to add metrics", "error"),
  });

  const totalPages = Math.max(1, Math.ceil(metrics.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleMetrics = useMemo(
    () => metrics.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [metrics, safePage]
  );

  const totals = metrics.reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  const avgRoas = metrics.filter((m) => m.roas).reduce((a, m) => a + (m.roas ?? 0), 0) / (metrics.filter((m) => m.roas).length || 1);

  return (
    <div className="space-y-5">
      {metricsError && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Couldn&apos;t load ad metrics. Try refreshing.
        </p>
      )}
      <PageHeader title="Ad performance" description="Live metrics across all client accounts">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add entry
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Total Spend" value={`₹${totals.spend.toLocaleString()}`} icon={<DollarSign className="w-4 h-4 text-yellow-400" />} />
        <MetricCard label="Impressions" value={totals.impressions.toLocaleString()} icon={<Eye className="w-4 h-4 text-blue-400" />} />
        <MetricCard label="Clicks" value={totals.clicks.toLocaleString()} icon={<MousePointer className="w-4 h-4 text-indigo-400" />} />
        <MetricCard label="Conversions" value={totals.conversions.toLocaleString()} icon={<Target className="w-4 h-4 text-green-400" />} />
        <MetricCard label="Avg ROAS" value={`${avgRoas.toFixed(2)}x`} icon={<TrendingUp className="w-4 h-4 text-purple-400" />} />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-medium text-white">Account Breakdown</h2>
        </div>
        {metrics.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-gray-700" aria-hidden="true" />
            <p className="text-sm text-gray-500">No ad data yet</p>
            <p className="mt-1 text-xs text-gray-600">Log metrics manually to start tracking performance.</p>
            <Button size="sm" onClick={() => setAdding(true)} className="mt-4">
              <Plus className="h-3.5 w-3.5" /> Add first entry
            </Button>
          </div>
        ) : (
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Client", "Platform", "Date", "Spend", "Impressions", "Clicks", "CTR", "Conversions", "ROAS"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-400 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {visibleMetrics.map((m) => (
                <tr key={m.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm text-white">{m.adAccount.client.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLOR[m.adAccount.platform] ?? PLATFORM_COLOR.OTHER}`}>
                      {m.adAccount.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(m.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td className="px-4 py-3 text-gray-300">₹{m.spend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">{m.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">{m.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">{m.ctr ? `${m.ctr.toFixed(2)}%` : "—"}</td>
                  <td className="px-4 py-3 text-gray-300">{m.conversions}</td>
                  <td className={`px-4 py-3 font-medium ${(m.roas ?? 0) >= 2 ? "text-green-400" : (m.roas ?? 0) >= 1 ? "text-yellow-400" : "text-red-400"}`}>
                    {m.roas ? `${m.roas.toFixed(2)}x` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, metrics.length)} of {metrics.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="text-xs text-gray-400 px-2" aria-live="polite">{safePage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual entry modal */}
      {adding && (
        <Modal
          title="Add ad metrics"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" loading={addMetric.isPending} disabled={!form.clientId} onClick={() => addMetric.mutate()}>
                Save metrics
              </Button>
            </>
          }
        >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Client *</label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Platform</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className={inputClass}
                  >
                    <option value="META">Meta</option>
                    <option value="GOOGLE">Google</option>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Account Name</label>
                  <input
                    value={form.accountName}
                    onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "spend", label: "Spend (₹)", placeholder: "5000" },
                  { key: "impressions", label: "Impressions", placeholder: "10000" },
                  { key: "clicks", label: "Clicks", placeholder: "500" },
                  { key: "conversions", label: "Conversions", placeholder: "25" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                    <input
                      type="number"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
        </Modal>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
