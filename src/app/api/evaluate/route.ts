import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { toFile } from "openai";
import { auth } from "@/auth";
import { EVALUATION_SCHEMA, type EvaluationResult } from "@/lib/evaluation";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_BYTES = 25 * 1024 * 1024; // Whisper API limit
const AUDIO_EXTENSIONS = [
  ".mp3", ".wav", ".m4a", ".mp4", ".mpeg", ".mpga", ".webm", ".ogg", ".flac",
];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured (needed for transcription)." },
      { status: 503 }
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured (needed for evaluation)." },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const criteria = String(formData.get("criteria") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 25 MB transcription limit (${(file.size / 1024 / 1024).toFixed(1)} MB).` },
      { status: 413 }
    );
  }
  const lowerName = file.name.toLowerCase();
  if (!AUDIO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return NextResponse.json(
      { error: `Unsupported file type. Supported: ${AUDIO_EXTENSIONS.join(", ")}` },
      { status: 415 }
    );
  }
  if (!criteria.trim()) {
    return NextResponse.json({ error: "Evaluation criteria is empty." }, { status: 400 });
  }

  // Step 1: transcribe with Whisper
  let transcript: string;
  try {
    const openai = new OpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(Buffer.from(await file.arrayBuffer()), file.name),
      model: "whisper-1",
    });
    transcript = transcription.text;
  } catch (e) {
    return NextResponse.json(
      { error: `Transcription failed: ${e instanceof Error ? e.message : "unknown error"}` },
      { status: 502 }
    );
  }

  if (!transcript.trim()) {
    return NextResponse.json(
      { error: "Transcription produced no text — the audio may be silent or unsupported." },
      { status: 422 }
    );
  }

  // Step 2: evaluate with Claude (structured output)
  try {
    const anthropic = new Anthropic();
    const stream = anthropic.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      system:
        "You are a meticulous, fair call-quality evaluator. You score sales and " +
        "support calls against a rubric using only evidence found in the " +
        "transcript. You never invent facts. When information is not present " +
        "in the transcript, you write 'Not stated'. Scores must be internally " +
        "consistent: category scores equal the sum of their criteria points, " +
        "and the overall score equals the sum of category scores.",
      messages: [
        {
          role: "user",
          content: `Evaluate the following call transcript against the rubric.

<rubric>
${criteria}
</rubric>

<transcript filename="${file.name}">
${transcript}
</transcript>

Fill every field of the required output schema. Keep evidence quotes short (under 25 words each).`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: EVALUATION_SCHEMA,
        },
      },
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The evaluation model declined to process this content." },
        { status: 422 }
      );
    }
    if (message.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "Evaluation output was truncated. Try a shorter call or simpler criteria." },
        { status: 502 }
      );
    }

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Evaluation returned no content." },
        { status: 502 }
      );
    }
    const evaluation = JSON.parse(textBlock.text) as EvaluationResult;

    return NextResponse.json({
      file_name: file.name,
      transcript,
      evaluation,
      evaluated_at: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Evaluation rate-limited. Wait a minute and retry." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: `Evaluation failed: ${e instanceof Error ? e.message : "unknown error"}` },
      { status: 502 }
    );
  }
}
