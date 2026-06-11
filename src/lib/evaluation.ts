// Shared types + JSON schema for the structured evaluation returned by Claude.

export interface CriterionScore {
  criterion: string;
  max_points: number;
  points_awarded: number;
  evidence: string;
}

export interface CategoryScore {
  category: string;
  max_score: number;
  score: number;
  criteria_breakdown: CriterionScore[];
  comments: string;
}

export interface NextStep {
  action: string;
  owner: string;
  due_date: string;
}

export interface ChecklistItem {
  item: string;
  status: string;
}

export interface CriticalMistake {
  issue: string;
  severity: string;
}

export interface EvaluationResult {
  call_metadata: {
    agent_name: string;
    customer_name: string;
    call_duration: string;
    product_service: string;
    call_date: string;
  };
  executive_summary: {
    overall_score: number;
    rating: string;
    call_outcome: string;
    customer_action_completed: string;
    primary_objective_achieved: string;
    one_line_summary: string;
  };
  call_summary: {
    customer_situation: string;
    what_happened: string;
    final_outcome: string;
    next_steps: NextStep[];
  };
  scorecard: CategoryScore[];
  sentiment: {
    customer_satisfaction: string;
    customer_confidence: string;
    trust_level: string;
    frustration_level: string;
    evidence: string;
  };
  conversation_intelligence: {
    highlights: string[];
    missed_opportunities: string[];
    critical_mistakes: CriticalMistake[];
  };
  goal_achievement: {
    expected_objective: string;
    actual_outcome: string;
    completion_status: ChecklistItem[];
  };
  task_completion: {
    required_action: string;
    assessment: ChecklistItem[];
    completion_score: number;
    evidence: string;
  };
  risk_flags: string[];
  coaching: {
    did_well: string[];
    improve: string[];
    immediate: string[];
    short_term: string[];
    long_term: string[];
  };
  final_verdict: {
    overall_rating: string;
    summary_judgment: string;
    manager_feedback: string;
  };
}

export interface CallAuditRecord {
  file_name: string;
  transcript: string;
  evaluation: EvaluationResult;
  evaluated_at: string;
}

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const strArr = { type: "array", items: str } as const;

function obj(
  properties: Record<string, unknown>,
  required?: string[]
): Record<string, unknown> {
  return {
    type: "object",
    properties,
    required: required ?? Object.keys(properties),
    additionalProperties: false,
  };
}

export const EVALUATION_SCHEMA: Record<string, unknown> = obj({
  call_metadata: obj({
    agent_name: str,
    customer_name: str,
    call_duration: str,
    product_service: str,
    call_date: str,
  }),
  executive_summary: obj({
    overall_score: num,
    rating: str,
    call_outcome: str,
    customer_action_completed: str,
    primary_objective_achieved: str,
    one_line_summary: str,
  }),
  call_summary: obj({
    customer_situation: str,
    what_happened: str,
    final_outcome: str,
    next_steps: {
      type: "array",
      items: obj({ action: str, owner: str, due_date: str }),
    },
  }),
  scorecard: {
    type: "array",
    items: obj({
      category: str,
      max_score: num,
      score: num,
      criteria_breakdown: {
        type: "array",
        items: obj({
          criterion: str,
          max_points: num,
          points_awarded: num,
          evidence: str,
        }),
      },
      comments: str,
    }),
  },
  sentiment: obj({
    customer_satisfaction: str,
    customer_confidence: str,
    trust_level: str,
    frustration_level: str,
    evidence: str,
  }),
  conversation_intelligence: obj({
    highlights: strArr,
    missed_opportunities: strArr,
    critical_mistakes: {
      type: "array",
      items: obj({ issue: str, severity: str }),
    },
  }),
  goal_achievement: obj({
    expected_objective: str,
    actual_outcome: str,
    completion_status: {
      type: "array",
      items: obj({ item: str, status: str }),
    },
  }),
  task_completion: obj({
    required_action: str,
    assessment: {
      type: "array",
      items: obj({ item: str, status: str }),
    },
    completion_score: num,
    evidence: str,
  }),
  risk_flags: strArr,
  coaching: obj({
    did_well: strArr,
    improve: strArr,
    immediate: strArr,
    short_term: strArr,
    long_term: strArr,
  }),
  final_verdict: obj({
    overall_rating: str,
    summary_judgment: str,
    manager_feedback: str,
  }),
});
