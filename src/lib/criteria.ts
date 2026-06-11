// Default evaluation criteria. Shown in the UI as an editable rubric and sent
// verbatim to the evaluation model. Users may edit categories, weights, or
// guidance; the model maps whatever rubric it receives onto the structured
// report schema.

export const DEFAULT_CRITERIA = `# Sales Call Evaluation Rubric

You are an expert call-quality analyst. Evaluate the call strictly against the
scorecard below using only evidence from the transcript. Quote or paraphrase
specific moments from the call as evidence wherever possible. If a category is
not applicable to this call (e.g. no objections were raised), award full marks
for that category and note "N/A — no opportunity observed" in the comments.

## Rating Scale (overall score out of 100)

| Score | Rating |
|-------|--------|
| 90-100 | Excellent |
| 80-89 | Good |
| 70-79 | Satisfactory |
| 60-69 | Needs Improvement |
| Below 60 | Unsatisfactory |

## Scorecard (100 points total)

### 1. Opening & Greeting (10 points)
- Proper, warm greeting used (2)
- Agent introduced themselves and the company (2)
- Confirmed customer identity (2)
- Clearly set the purpose of the call (2)
- Professional and friendly tone from the start (2)

Scoring guide: 9-10 = warm, professional, purpose clearly stated; 6-8 =
completed but mechanical; 0-5 = abrupt start, no greeting, or unclear purpose.

### 2. Discovery & Understanding (15 points)
- Asked relevant, open-ended discovery questions (4)
- Accurately understood the customer's needs (4)
- Identified underlying pain points, not just surface requests (3)
- Clarified ambiguities instead of assuming (2)
- Demonstrated active listening (paraphrasing, acknowledging) (2)

Scoring guide: 13-15 = deep understanding with strong questioning; 8-12 =
basic understanding; 0-7 = little or no discovery performed.

### 3. Communication Quality (15 points)
- Clear, concise communication (3)
- Avoided unexplained jargon; matched the customer's vocabulary (2)
- Logical conversation flow without abrupt jumps (3)
- Professional, courteous language throughout (3)
- Projected confidence and credibility (2)
- Appropriate pacing — neither rushed nor dragging (2)

### 4. Product / Solution Presentation (15 points)
- Presented the correct solution for the stated need (4)
- Explained features clearly and accurately (3)
- Linked benefits explicitly to the customer's needs (4)
- Communicated a compelling value proposition (2)
- Used relevant examples, analogies, or social proof (2)

### 5. Objection Handling (10 points)
- Acknowledged objections without becoming defensive (2)
- Explored the root cause behind each objection (3)
- Addressed concerns accurately and honestly (3)
- Maintained professionalism and composure under pushback (2)

### 6. Customer Engagement (10 points)
- Encouraged the customer to participate and ask questions (2)
- Proactively asked for feedback and reactions (2)
- Checked understanding at key points (2)
- Demonstrated genuine empathy (2)
- Built rapport naturally (2)

### 7. Process Compliance & Accuracy (10 points)
- Followed the required call process / script milestones (3)
- All information provided was factually accurate (3)
- Completed mandatory disclosures (2)
- Met regulatory / compliance requirements (2)

### 8. Action Completion & Resolution (10 points)
- Defined a clear, specific next action (2)
- Confirmed the customer understood the action (2)
- Guided the customer through the action effectively (2)
- Required task was completed on the call where possible (3)
- Resolution achieved or a credible path to resolution set (1)

Scoring guide: 9-10 = customer completed the required task; 6-8 = progress
made but incomplete; 0-5 = no meaningful progress.

### 9. Closing (5 points)
- Summarized the discussion and agreements (2)
- Confirmed next steps and ownership (1)
- Invited final questions (1)
- Professional, positive farewell (1)

## Additional Analysis Required

Beyond the scorecard, provide:

1. **Call metadata** — agent name, customer name, call duration, product or
   service discussed, and call date if mentioned (use "Not stated" when the
   transcript does not reveal a value).
2. **Executive summary** — overall score, rating, call outcome
   (Successful / Partially Successful / Unsuccessful), whether the customer
   action was completed, and whether the primary objective was achieved.
3. **Call summary** — customer situation, what happened, final outcome, and
   next steps with owner and due date where stated.
4. **Sentiment analysis** — customer satisfaction, confidence, trust, and
   frustration (High / Medium / Low) with supporting evidence.
5. **Conversation intelligence** — up to 5 positive behaviors observed, up to
   5 missed opportunities, and any critical mistakes with severity
   (High / Medium / Low).
6. **Goal achievement** — expected objective vs. actual outcome, plus a
   completion checklist (need identified, solution presented, objections
   addressed, customer agreed, action completed, follow-up scheduled).
7. **Customer task completion** — what the customer was expected to do
   (e.g. submit documents, make payment, book appointment), whether they
   understood, agreed, and completed it, with a completion score out of 10.
8. **Risk flags** — any of: Confused, Dissatisfied, Unconvinced, Price
   Sensitive, Competitor Mentioned, Requested Follow-up, Escalation Risk,
   Churn Risk.
9. **Coaching feedback** — 3 things the agent did well, 3 things to improve,
   and recommended coaching actions (immediate / short-term / long-term).
10. **Final verdict** — overall rating, a summary judgment covering customer
    experience, agent effectiveness, goal achievement and improvement
    opportunities, and a one-line manager feedback quote.
`;
