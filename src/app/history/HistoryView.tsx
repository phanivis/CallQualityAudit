"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CallAuditRecord } from "@/lib/evaluation";
import { loadHistory, deleteAuditRecord } from "@/lib/clientStorage";
import { renderReportBody, renderStandaloneHtml, REPORT_CSS } from "@/lib/reportHtml";
import { downloadExcel } from "@/lib/excel";

function ratingPillClass(rating: string): string {
  const r = rating.toLowerCase();
  if (r.includes("excellent")) return "bg-green-100 text-green-800";
  if (r.includes("good")) return "bg-blue-100 text-blue-800";
  if (r.includes("satisfactory")) return "bg-yellow-100 text-yellow-800";
  if (r.includes("needs")) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export default function HistoryView({ userEmail }: { userEmail: string }) {
  const [records, setRecords] = useState<CallAuditRecord[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory(userEmail)
      .then(setRecords)
      .catch(() => setError("Failed to load audit history."));
  }, [userEmail]);

  async function remove(id: string) {
    if (!confirm("Delete this audit from history? This cannot be undone.")) return;
    await deleteAuditRecord(userEmail, id);
    setRecords((prev) => prev?.filter((r) => r.id !== id) ?? null);
    if (openId === id) setOpenId(null);
  }

  function downloadHtml(record: CallAuditRecord) {
    const blob = new Blob([renderStandaloneHtml(record)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.file_name.replace(/\.[^.]+$/, "")}-audit-report.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const openRecord = records?.find((r) => r.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <style dangerouslySetInnerHTML={{ __html: REPORT_CSS }} />

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit History</h1>
          <p className="text-sm text-gray-500">
            Previously evaluated calls for {userEmail}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {records && records.length > 0 && (
            <button
              onClick={() => downloadExcel(records)}
              className="rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              Download Excel ({records.length} {records.length === 1 ? "row" : "rows"})
            </button>
          )}
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            New audit
          </Link>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {records === null ? (
        <p className="text-gray-500">Loading history…</p>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="font-medium">No audits yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Evaluated calls will appear here automatically.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Audit your first call
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Evaluated</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium">
                    {r.file_name}
                  </td>
                  <td className="px-4 py-3">{r.evaluation.call_metadata.agent_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.evaluated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {r.evaluation.executive_summary.overall_score}/100
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ratingPillClass(r.evaluation.executive_summary.rating)}`}
                    >
                      {r.evaluation.executive_summary.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-100"
                      >
                        {openId === r.id ? "Hide report" : "View report"}
                      </button>
                      <button
                        onClick={() => downloadHtml(r)}
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-100"
                      >
                        HTML
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openRecord && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => downloadHtml(openRecord)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Download HTML report
            </button>
          </div>
          <div dangerouslySetInnerHTML={{ __html: renderReportBody(openRecord) }} />
        </div>
      )}
    </div>
  );
}
