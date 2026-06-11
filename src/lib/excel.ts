import * as XLSX from "xlsx";
import type { CallAuditRecord } from "@/lib/evaluation";

// One row per call, with per-category score columns plus summary fields.
export function downloadExcel(records: CallAuditRecord[]) {
  const categoryNames = Array.from(
    new Set(records.flatMap((r) => r.evaluation.scorecard.map((c) => c.category)))
  );

  const rows = records.map((r) => {
    const ev = r.evaluation;
    const row: Record<string, string | number> = {
      "File Name": r.file_name,
      "Evaluated At": new Date(r.evaluated_at).toLocaleString(),
      "Agent Name": ev.call_metadata.agent_name,
      "Customer Name": ev.call_metadata.customer_name,
      "Call Date": ev.call_metadata.call_date,
      "Call Duration": ev.call_metadata.call_duration,
      "Product/Service": ev.call_metadata.product_service,
      "Overall Score": ev.executive_summary.overall_score,
      Rating: ev.executive_summary.rating,
      "Call Outcome": ev.executive_summary.call_outcome,
      "Customer Action Completed": ev.executive_summary.customer_action_completed,
      "Objective Achieved": ev.executive_summary.primary_objective_achieved,
    };
    for (const name of categoryNames) {
      const cat = ev.scorecard.find((c) => c.category === name);
      row[name] = cat ? `${cat.score}/${cat.max_score}` : "";
    }
    row["Customer Satisfaction"] = ev.sentiment.customer_satisfaction;
    row["Frustration Level"] = ev.sentiment.frustration_level;
    row["Task Completion Score"] = `${ev.task_completion.completion_score}/10`;
    row["Risk Flags"] = ev.risk_flags.join(", ");
    row["Top Strength"] = ev.coaching.did_well[0] ?? "";
    row["Top Improvement"] = ev.coaching.improve[0] ?? "";
    row["One-Line Summary"] = ev.executive_summary.one_line_summary;
    row["Manager Feedback"] = ev.final_verdict.manager_feedback;
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] ?? {}).map((k) => ({
    wch: Math.min(40, Math.max(k.length + 2, 14)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Call Audits");
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `call-quality-audit-${stamp}.xlsx`);
}
