import type { CallAuditRecord, EvaluationResult } from "@/lib/evaluation";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ratingClass(rating: string): string {
  const r = rating.toLowerCase();
  if (r.includes("excellent")) return "r-excellent";
  if (r.includes("good")) return "r-good";
  if (r.includes("satisfactory")) return "r-satisfactory";
  if (r.includes("needs")) return "r-needs";
  return "r-poor";
}

function list(items: string[]): string {
  if (!items.length) return "<p class='muted'>None noted.</p>";
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  const cls = s.startsWith("yes") || s === "completed" || s === "done"
    ? "ok"
    : s.startsWith("no")
      ? "bad"
      : "warn";
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

export const REPORT_CSS = `
.cqa-report { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a202c; line-height: 1.55; max-width: 880px; margin: 0 auto; }
.cqa-report h1 { font-size: 1.6rem; margin: 0 0 4px; }
.cqa-report h2 { font-size: 1.15rem; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
.cqa-report h3 { font-size: 1rem; margin: 18px 0 6px; }
.cqa-report table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 0.9rem; }
.cqa-report th, .cqa-report td { border: 1px solid #e2e8f0; padding: 7px 10px; text-align: left; vertical-align: top; }
.cqa-report th { background: #f7fafc; font-weight: 600; }
.cqa-report .muted { color: #718096; font-style: italic; }
.cqa-report .score-hero { display: flex; gap: 24px; align-items: center; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 24px; margin: 16px 0; flex-wrap: wrap; }
.cqa-report .score-num { font-size: 3rem; font-weight: 800; line-height: 1; }
.cqa-report .score-den { font-size: 1.1rem; color: #718096; font-weight: 500; }
.cqa-report .rating-pill { padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 0.95rem; }
.cqa-report .r-excellent { background: #c6f6d5; color: #22543d; }
.cqa-report .r-good { background: #bee3f8; color: #2a4365; }
.cqa-report .r-satisfactory { background: #fefcbf; color: #744210; }
.cqa-report .r-needs { background: #feebc8; color: #7b341e; }
.cqa-report .r-poor { background: #fed7d7; color: #742a2a; }
.cqa-report .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
.cqa-report .badge.ok { background: #c6f6d5; color: #22543d; }
.cqa-report .badge.bad { background: #fed7d7; color: #742a2a; }
.cqa-report .badge.warn { background: #fefcbf; color: #744210; }
.cqa-report .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 12px 0; }
.cqa-report .meta-item { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; }
.cqa-report .meta-item .k { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: #718096; }
.cqa-report .meta-item .v { font-weight: 600; }
.cqa-report .quote { border-left: 4px solid #cbd5e0; margin: 8px 0; padding: 4px 14px; color: #4a5568; font-style: italic; }
.cqa-report details { margin: 6px 0; }
.cqa-report summary { cursor: pointer; font-weight: 600; }
.cqa-report .transcript { white-space: pre-wrap; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 0.85rem; max-height: 420px; overflow-y: auto; }
`;

export function renderReportBody(record: CallAuditRecord): string {
  const ev: EvaluationResult = record.evaluation;
  const m = ev.call_metadata;
  const ex = ev.executive_summary;
  const totalMax = ev.scorecard.reduce((a, c) => a + c.max_score, 0) || 100;

  return `
<div class="cqa-report">
  <h1>Call Quality Audit Report</h1>
  <p class="muted">${esc(record.file_name)} · evaluated ${esc(new Date(record.evaluated_at).toLocaleString())}</p>

  <div class="meta-grid">
    <div class="meta-item"><div class="k">Agent</div><div class="v">${esc(m.agent_name)}</div></div>
    <div class="meta-item"><div class="k">Customer</div><div class="v">${esc(m.customer_name)}</div></div>
    <div class="meta-item"><div class="k">Duration</div><div class="v">${esc(m.call_duration)}</div></div>
    <div class="meta-item"><div class="k">Product / Service</div><div class="v">${esc(m.product_service)}</div></div>
    <div class="meta-item"><div class="k">Call Date</div><div class="v">${esc(m.call_date)}</div></div>
  </div>

  <div class="score-hero">
    <div><span class="score-num">${esc(ex.overall_score)}</span><span class="score-den">/${totalMax}</span></div>
    <span class="rating-pill ${ratingClass(ex.rating)}">${esc(ex.rating)}</span>
    <div>
      <div><strong>Outcome:</strong> ${statusBadge(ex.call_outcome)}</div>
      <div><strong>Customer action completed:</strong> ${statusBadge(ex.customer_action_completed)}</div>
      <div><strong>Primary objective achieved:</strong> ${statusBadge(ex.primary_objective_achieved)}</div>
    </div>
  </div>
  <p><strong>Summary:</strong> ${esc(ex.one_line_summary)}</p>

  <h2>Call Summary</h2>
  <h3>Customer Situation</h3><p>${esc(ev.call_summary.customer_situation)}</p>
  <h3>What Happened</h3><p>${esc(ev.call_summary.what_happened)}</p>
  <h3>Final Outcome</h3><p>${esc(ev.call_summary.final_outcome)}</p>
  ${ev.call_summary.next_steps.length ? `
  <h3>Next Steps</h3>
  <table><thead><tr><th>Action</th><th>Owner</th><th>Due Date</th></tr></thead><tbody>
    ${ev.call_summary.next_steps.map((s) => `<tr><td>${esc(s.action)}</td><td>${esc(s.owner)}</td><td>${esc(s.due_date)}</td></tr>`).join("")}
  </tbody></table>` : ""}

  <h2>Evaluation Scorecard</h2>
  <table><thead><tr><th>Category</th><th>Score</th><th>Max</th></tr></thead><tbody>
    ${ev.scorecard.map((c) => `<tr><td>${esc(c.category)}</td><td><strong>${esc(c.score)}</strong></td><td>${esc(c.max_score)}</td></tr>`).join("")}
    <tr><th>TOTAL</th><th>${esc(ex.overall_score)}</th><th>${totalMax}</th></tr>
  </tbody></table>

  ${ev.scorecard.map((c) => `
  <details>
    <summary>${esc(c.category)} — ${esc(c.score)}/${esc(c.max_score)}</summary>
    <table><thead><tr><th>Criterion</th><th>Points</th><th>Evidence</th></tr></thead><tbody>
      ${c.criteria_breakdown.map((cb) => `<tr><td>${esc(cb.criterion)}</td><td>${esc(cb.points_awarded)}/${esc(cb.max_points)}</td><td>${esc(cb.evidence)}</td></tr>`).join("")}
    </tbody></table>
    <p><strong>Comments:</strong> ${esc(c.comments)}</p>
  </details>`).join("")}

  <h2>Customer Experience</h2>
  <table><thead><tr><th>Area</th><th>Rating</th></tr></thead><tbody>
    <tr><td>Customer Satisfaction</td><td>${statusBadge(ev.sentiment.customer_satisfaction)}</td></tr>
    <tr><td>Customer Confidence</td><td>${statusBadge(ev.sentiment.customer_confidence)}</td></tr>
    <tr><td>Trust Level</td><td>${statusBadge(ev.sentiment.trust_level)}</td></tr>
    <tr><td>Frustration Level</td><td>${statusBadge(ev.sentiment.frustration_level)}</td></tr>
  </tbody></table>
  <div class="quote">${esc(ev.sentiment.evidence)}</div>

  <h2>Conversation Intelligence</h2>
  <h3>Positive Behaviors</h3>${list(ev.conversation_intelligence.highlights)}
  <h3>Missed Opportunities</h3>${list(ev.conversation_intelligence.missed_opportunities)}
  <h3>Critical Mistakes</h3>
  ${ev.conversation_intelligence.critical_mistakes.length ? `
  <table><thead><tr><th>Issue</th><th>Severity</th></tr></thead><tbody>
    ${ev.conversation_intelligence.critical_mistakes.map((cm) => `<tr><td>${esc(cm.issue)}</td><td>${statusBadge(cm.severity)}</td></tr>`).join("")}
  </tbody></table>` : "<p class='muted'>None identified.</p>"}

  <h2>Goal Achievement</h2>
  <p><strong>Expected objective:</strong> ${esc(ev.goal_achievement.expected_objective)}</p>
  <p><strong>Actual outcome:</strong> ${esc(ev.goal_achievement.actual_outcome)}</p>
  <table><thead><tr><th>Outcome</th><th>Status</th></tr></thead><tbody>
    ${ev.goal_achievement.completion_status.map((c) => `<tr><td>${esc(c.item)}</td><td>${statusBadge(c.status)}</td></tr>`).join("")}
  </tbody></table>

  <h2>Customer Task Completion</h2>
  <p><strong>Required action:</strong> ${esc(ev.task_completion.required_action)}</p>
  <table><thead><tr><th>Item</th><th>Status</th></tr></thead><tbody>
    ${ev.task_completion.assessment.map((c) => `<tr><td>${esc(c.item)}</td><td>${statusBadge(c.status)}</td></tr>`).join("")}
  </tbody></table>
  <p><strong>Completion score:</strong> ${esc(ev.task_completion.completion_score)}/10</p>
  <div class="quote">${esc(ev.task_completion.evidence)}</div>

  <h2>Risk Assessment</h2>
  ${ev.risk_flags.length ? ev.risk_flags.map((r) => `<span class="badge warn" style="margin-right:6px">${esc(r)}</span>`).join("") : "<p class='muted'>No risk flags.</p>"}

  <h2>Coaching Feedback</h2>
  <h3>What the Agent Did Well</h3>${list(ev.coaching.did_well)}
  <h3>What to Improve</h3>${list(ev.coaching.improve)}
  <h3>Recommended Actions</h3>
  <table><thead><tr><th>Immediate</th><th>Short-Term</th><th>Long-Term</th></tr></thead><tbody>
    <tr>
      <td>${list(ev.coaching.immediate)}</td>
      <td>${list(ev.coaching.short_term)}</td>
      <td>${list(ev.coaching.long_term)}</td>
    </tr>
  </tbody></table>

  <h2>Final Verdict</h2>
  <p><span class="rating-pill ${ratingClass(ev.final_verdict.overall_rating)}">${esc(ev.final_verdict.overall_rating)}</span></p>
  <p>${esc(ev.final_verdict.summary_judgment)}</p>
  <div class="quote">"${esc(ev.final_verdict.manager_feedback)}"</div>

  <h2>Transcript</h2>
  <details><summary>Show full transcript</summary>
    <div class="transcript">${esc(record.transcript)}</div>
  </details>
</div>`;
}

export function renderStandaloneHtml(record: CallAuditRecord): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Call Quality Audit — ${esc(record.file_name)}</title>
<style>body { margin: 24px; background: #fff; } ${REPORT_CSS}</style>
</head>
<body>
${renderReportBody(record)}
</body>
</html>`;
}
