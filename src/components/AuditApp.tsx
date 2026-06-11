"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { DEFAULT_CRITERIA } from "@/lib/criteria";
import type { CallAuditRecord } from "@/lib/evaluation";
import { renderReportBody, renderStandaloneHtml, REPORT_CSS } from "@/lib/reportHtml";
import { downloadExcel } from "@/lib/excel";
import { loadCriteria, saveCriteria, saveAuditRecord } from "@/lib/clientStorage";

type FileStatus = "queued" | "transcribing & evaluating" | "done" | "error";

interface QueuedFile {
  file: File;
  status: FileStatus;
  error?: string;
  result?: CallAuditRecord;
}

export default function AuditApp({ userLabel }: { userLabel: string }) {
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [criteriaLoaded, setCriteriaLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showCriteria, setShowCriteria] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [running, setRunning] = useState(false);
  const [activeReport, setActiveReport] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextSave = useRef(true);

  // Load the user's saved criteria once on mount.
  useEffect(() => {
    let cancelled = false;
    loadCriteria(userLabel).then((saved) => {
      if (cancelled) return;
      if (saved && saved.trim()) {
        skipNextSave.current = true;
        setCriteria(saved);
      }
      setCriteriaLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userLabel]);

  // Auto-save criteria edits (debounced) so they persist per user.
  useEffect(() => {
    if (!criteriaLoaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      await saveCriteria(userLabel, criteria);
      setSaveState("saved");
    }, 800);
    return () => clearTimeout(t);
  }, [criteria, criteriaLoaded, userLabel]);

  const results = queue.filter((q) => q.result).map((q) => q.result!) as CallAuditRecord[];

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map<QueuedFile>((file) => ({
      file,
      status: "queued",
    }));
    setQueue((prev) => [...prev, ...next]);
  }

  function removeFile(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    setActiveReport(null);
  }

  async function submit() {
    if (running) return;
    setRunning(true);
    setActiveReport(null);
    // Process sequentially to stay inside API rate limits.
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === "done") continue;
      setQueue((prev) =>
        prev.map((q, j) => (j === i ? { ...q, status: "transcribing & evaluating", error: undefined } : q))
      );
      try {
        const form = new FormData();
        form.append("file", queue[i].file);
        form.append("criteria", criteria);
        const res = await fetch("/api/evaluate", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
        setQueue((prev) =>
          prev.map((q, j) => (j === i ? { ...q, status: "done", result: data } : q))
        );
        // Persist to per-user audit history (server storage or local fallback).
        void saveAuditRecord(userLabel, data as CallAuditRecord);
      } catch (e) {
        setQueue((prev) =>
          prev.map((q, j) =>
            j === i
              ? { ...q, status: "error", error: e instanceof Error ? e.message : "Unknown error" }
              : q
          )
        );
      }
    }
    setRunning(false);
  }

  function downloadHtml(record: CallAuditRecord) {
    const html = renderStandaloneHtml(record);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.file_name.replace(/\.[^.]+$/, "")}-audit-report.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <style dangerouslySetInnerHTML={{ __html: REPORT_CSS }} />

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call Quality Audit</h1>
          <p className="text-sm text-gray-500">
            Upload call recordings, tune the rubric, get scored reports.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">{userLabel}</span>
          <Link
            href="/history"
            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
          >
            History
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Step 1: upload */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">1. Upload audio files</h2>
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-400 hover:bg-blue-50/40"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <p className="font-medium">Drop audio files here or click to browse</p>
          <p className="mt-1 text-xs text-gray-500">
            .mp3, .wav, .m4a, .ogg, .flac, .webm — up to 25 MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.mp4,.mpeg,.mpga,.webm,.ogg,.flac,audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {queue.length > 0 && (
          <ul className="mt-4 divide-y divide-gray-100">
            {queue.map((q, i) => (
              <li key={`${q.file.name}-${i}`} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{q.file.name}</span>
                  <span className="ml-2 text-gray-400">
                    {(q.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  {q.error && <p className="text-xs text-red-600">{q.error}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={
                      q.status === "done"
                        ? "text-green-600"
                        : q.status === "error"
                          ? "text-red-600"
                          : q.status === "queued"
                            ? "text-gray-400"
                            : "animate-pulse text-blue-600"
                    }
                  >
                    {q.status}
                  </span>
                  {!running && (
                    <button
                      onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-500"
                      aria-label={`Remove ${q.file.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Step 2: criteria */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            2. Evaluation criteria
            {saveState === "saving" && (
              <span className="ml-2 text-xs font-normal text-gray-400">Saving…</span>
            )}
            {saveState === "saved" && (
              <span className="ml-2 text-xs font-normal text-green-600">Saved ✓</span>
            )}
          </h2>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setShowCriteria((s) => !s)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
            >
              {showCriteria ? "Hide" : "Edit"}
            </button>
            {criteria !== DEFAULT_CRITERIA && (
              <button
                onClick={() => setCriteria(DEFAULT_CRITERIA)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Reset to default
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {criteria === DEFAULT_CRITERIA
            ? "Using the default 9-category, 100-point sales call rubric. Edit it or submit as-is."
            : "Using your customized rubric — changes save automatically and persist across sessions."}
        </p>
        {showCriteria && (
          <textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            spellCheck={false}
            className="mt-3 h-96 w-full rounded-lg border border-gray-300 p-3 font-mono text-xs focus:border-blue-400 focus:outline-none"
          />
        )}
      </section>

      {/* Step 3: submit */}
      <section className="mb-8 flex items-center gap-4">
        <button
          onClick={submit}
          disabled={running || queue.length === 0 || !criteria.trim()}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {running ? "Evaluating…" : `Submit ${queue.length || ""} ${queue.length === 1 ? "call" : "calls"}`}
        </button>
        {results.length > 0 && (
          <button
            onClick={() => downloadExcel(results)}
            className="rounded-xl border border-green-600 px-6 py-3 font-semibold text-green-700 hover:bg-green-50"
          >
            Download Excel ({results.length} {results.length === 1 ? "row" : "rows"})
          </button>
        )}
        {running && (
          <span className="text-sm text-gray-500">
            {doneCount}/{queue.length} done — each call takes 1–3 minutes
          </span>
        )}
      </section>

      {/* Results */}
      {results.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Reports</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {queue.map((q, i) =>
              q.result ? (
                <button
                  key={i}
                  onClick={() => setActiveReport(activeReport === i ? null : i)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    activeReport === i
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  {q.file.name} — {q.result.evaluation.executive_summary.overall_score}/100
                </button>
              ) : null
            )}
          </div>

          {activeReport !== null && queue[activeReport]?.result && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => downloadHtml(queue[activeReport]!.result!)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Download HTML report
                </button>
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderReportBody(queue[activeReport]!.result!),
                }}
              />
            </div>
          )}
          {activeReport === null && (
            <p className="text-sm text-gray-500">Select a call above to view its full report.</p>
          )}
        </section>
      )}
    </div>
  );
}
