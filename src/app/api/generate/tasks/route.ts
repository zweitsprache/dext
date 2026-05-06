import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { storeGeneratedTasks } from "@/lib/neon";

type ModelProvider = "anthropic" | "openai";

const EXERCISE_FORMATS = ["lueckentext", "mcq", "truefalse", "satzpuzzle", "textpuzzle", "zuordnung", "umformung", "wfragen", "stichwort"] as const;
const TRUE_FALSE_ANSWERS = ["Richtig", "Falsch", "Nicht im Text", "Unklar"] as const;

type ExerciseFormat = (typeof EXERCISE_FORMATS)[number];

type GeneratedTaskItem = {
  id: string;
  format: ExerciseFormat;
  instruction: string;
  question: string;
  options: string[];
  answer: string | string[];
  explanation: string;
};

type TaskResponse = {
  worksheetTitle: string;
  tasks: GeneratedTaskItem[];
};

type TaskRequest = {
  model?: string;
  niveau?: string;
  textsorte?: string;
  zielgruppe?: string;
  sourceText?: string;
  selectedFormats?: ExerciseFormat[];
  taskGlobalConfig?: {
    taskCount?: number;
    outputFormat?: "app";
    withSeparateSolutions?: boolean;
  };
  lueckentextConfig?: unknown;
  mcqConfig?: unknown;
  trueFalseConfig?: unknown;
};

type NormalizedTaskRequest = {
  model: string;
  niveau: string;
  textsorte: string;
  zielgruppe: string;
  sourceText: string;
  selectedFormats: ExerciseFormat[];
  taskGlobalConfig: {
    taskCount: number;
    outputFormat: "app";
    withSeparateSolutions: boolean;
  };
  lueckentextConfig: unknown;
  mcqConfig: unknown;
  trueFalseConfig: unknown;
};

const MODEL_PROVIDERS: Record<string, ModelProvider> = {
  "claude-opus-4-5": "anthropic",
  "claude-sonnet-4-5": "anthropic",
  "gpt-4.1": "openai",
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
};

const taskItemSchema = z.object({
  id: z.string().optional(),
  format: z.enum(EXERCISE_FORMATS),
  instruction: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).default([]),
  answer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().default(""),
});

const taskResponseSchema = z.object({
  worksheetTitle: z.string().min(1),
  tasks: z.array(taskItemSchema).min(1),
});

type GenerateRawFn = (system: string, prompt: string) => Promise<string>;

function allocateCounts(formats: ExerciseFormat[], totalCount: number): Array<{ format: ExerciseFormat; count: number }> {
  const base = Math.floor(totalCount / formats.length);
  let remainder = totalCount % formats.length;

  return formats.map((format) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder = Math.max(0, remainder - 1);
    return { format, count: base + extra };
  });
}

function buildSystemPrompt(): string {
  return `You create German reading-comprehension exercises for adults learning German as a second language.
Return only valid JSON.
Use only information supported by the source text.
Do not invent facts outside the text.
Keep instructions concise and classroom-ready.

Return exactly this shape:
{
  "worksheetTitle": "string",
  "tasks": [
    {
      "id": "string",
      "format": "lueckentext|mcq|truefalse|satzpuzzle|textpuzzle|zuordnung|umformung|wfragen|stichwort",
      "instruction": "string",
      "question": "string",
      "options": ["string"],
      "answer": "string or array of strings",
      "explanation": "string"
    }
  ]
}

Rules:
- worksheetTitle: 3-8 words.
- tasks: exactly the requested number of tasks.
- Each task format must follow the requested allocation exactly.
- For mcq, options must contain plausible answers and answer must match one or more options.
- For truefalse, question must contain the statement, options must contain the available scale labels, and answer must be one of: Richtig, Falsch, Nicht im Text, Unklar.
- For lueckentext, question must contain visible gaps like ____.
- For satzpuzzle, options must contain the scrambled words or chunks that learners need to reorder.
- For textpuzzle, options should contain the scrambled text parts or paragraphs.
- explanation must be short and useful for teachers.`;
}

function buildUserPrompt(input: NormalizedTaskRequest): string {
  const allocations = allocateCounts(input.selectedFormats, input.taskGlobalConfig.taskCount)
    .map((entry) => `${entry.format}: ${entry.count}`)
    .join(", ");

  return `Create exercises based on this source text.

Context
- Niveau: ${input.niveau}
- Textsorte: ${input.textsorte}
- Zielgruppe: ${input.zielgruppe}
- Output format: in app
- Separate solutions: ${input.taskGlobalConfig.withSeparateSolutions ? "yes" : "no"}
- Requested task count: ${input.taskGlobalConfig.taskCount}
- Requested formats: ${input.selectedFormats.join(", ")}
- Per-format allocation: ${allocations}

Format-specific config
- Lueckentext config: ${JSON.stringify(input.lueckentextConfig)}
- MCQ config: ${JSON.stringify(input.mcqConfig)}
- True/False config: ${JSON.stringify(input.trueFalseConfig)}

Source text:
${input.sourceText}

Important requirements
- Keep the exercise language aligned with the source text level.
- Prefer text-grounded tasks over generic schoolbook questions.
- If multiple formats are requested, include all requested formats.
- Do not mention glossary content.
- Keep all solutions fully grounded in the source text.
- Solutions must be concise and correct.`;
}

function buildRepairPrompt(input: NormalizedTaskRequest, invalidRaw: string, validationError: string): string {
  return `The previous response failed schema validation. Repair it and return only valid JSON.

You must preserve the requested task count and the requested per-format allocation.
Requested formats: ${input.selectedFormats.join(", ")}
Requested task count: ${input.taskGlobalConfig.taskCount}

Validation errors:
${validationError}

Previous invalid output:
${invalidRaw}`;
}

function normalizeTaskResponse(parsed: z.infer<typeof taskResponseSchema>): TaskResponse {
  return {
    worksheetTitle: parsed.worksheetTitle.trim(),
    tasks: parsed.tasks.map((task, index) => ({
      id: task.id?.trim() || `task-${index + 1}`,
      format: task.format,
      instruction: task.instruction.trim(),
      question: task.question.trim(),
      options: task.options.map((option) => option.trim()).filter(Boolean),
      answer: Array.isArray(task.answer)
        ? task.answer.map((answer) => answer.trim()).filter(Boolean)
        : task.answer.trim(),
      explanation: task.explanation.trim(),
    })),
  };
}

function validateTaskResponse(response: TaskResponse, input: NormalizedTaskRequest): string[] {
  const issues: string[] = [];
  const expectedCounts = allocateCounts(input.selectedFormats, input.taskGlobalConfig.taskCount);
  const titleWordCount = response.worksheetTitle.split(/\s+/).filter(Boolean).length;

  if (titleWordCount < 2 || titleWordCount > 10) {
    issues.push("worksheetTitle must be between 2 and 10 words.");
  }

  if (response.tasks.length !== input.taskGlobalConfig.taskCount) {
    issues.push(`tasks must contain exactly ${input.taskGlobalConfig.taskCount} items.`);
  }

  for (const { format, count } of expectedCounts) {
    const actualCount = response.tasks.filter((task) => task.format === format).length;
    if (actualCount !== count) {
      issues.push(`format ${format} must appear exactly ${count} times, received ${actualCount}.`);
    }
  }

  response.tasks.forEach((task, index) => {
    const prefix = `task ${index + 1}`;
    const normalizedAnswers = Array.isArray(task.answer) ? task.answer : [task.answer];

    if (!input.selectedFormats.includes(task.format)) {
      issues.push(`${prefix}: format ${task.format} was not requested.`);
    }

    if (!task.instruction) {
      issues.push(`${prefix}: instruction is empty.`);
    }

    if (!task.question) {
      issues.push(`${prefix}: question is empty.`);
    }

    if (normalizedAnswers.length === 0 || normalizedAnswers.some((answer) => !answer)) {
      issues.push(`${prefix}: answer is empty.`);
    }

    if (task.format === "lueckentext") {
      if (!/_{3,}|\[\.\.\.\]/.test(task.question)) {
        issues.push(`${prefix}: lueckentext question must contain visible gaps.`);
      }
    }

    if (task.format === "mcq") {
      if (task.options.length < 3) {
        issues.push(`${prefix}: mcq must contain at least 3 options.`);
      }
      if (!normalizedAnswers.every((answer) => task.options.includes(answer))) {
        issues.push(`${prefix}: mcq answers must match the provided options.`);
      }
    }

    if (task.format === "truefalse") {
      if (task.options.length < 2) {
        issues.push(`${prefix}: truefalse must include the available scale labels in options.`);
      }
      if (!normalizedAnswers.every((answer) => TRUE_FALSE_ANSWERS.includes(answer as (typeof TRUE_FALSE_ANSWERS)[number]))) {
        issues.push(`${prefix}: truefalse answer must be one of ${TRUE_FALSE_ANSWERS.join(", ")}.`);
      }
    }

    if (task.format === "satzpuzzle" || task.format === "textpuzzle") {
      if (task.options.length < 3) {
        issues.push(`${prefix}: ${task.format} must include scrambled chunks in options.`);
      }
    }
  });

  return issues;
}

function parseTaskResponse(raw: string, input: NormalizedTaskRequest): TaskResponse {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonText = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    throw new Error("Model response was not valid JSON.");
  }

  const schemaResult = taskResponseSchema.safeParse(parsedJson);
  if (!schemaResult.success) {
    const schemaIssues = schemaResult.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
    throw new Error(`Task JSON schema validation failed: ${schemaIssues.join(" | ")}`);
  }

  const normalized = normalizeTaskResponse(schemaResult.data);
  const semanticIssues = validateTaskResponse(normalized, input);

  if (semanticIssues.length > 0) {
    throw new Error(`Task JSON semantic validation failed: ${semanticIssues.join(" | ")}`);
  }

  return normalized;
}

async function generateWithAnthropic(client: Anthropic, model: string, system: string, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 3200,
    temperature: 0.3,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content.map((block) => (block.type === "text" ? block.text : "")).join("").trim();
}

async function generateWithOpenAI(client: OpenAI, model: string, system: string, prompt: string): Promise<string> {
  const isReasoningModel = model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4");
  const response = await client.chat.completions.create({
    model,
    ...(isReasoningModel ? { max_completion_tokens: 6000 } : { max_tokens: 3200, temperature: 0.3 }),
    messages: [
      { role: isReasoningModel ? "developer" : "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

async function generateValidatedTaskResponse(generateFn: GenerateRawFn, systemPrompt: string, input: NormalizedTaskRequest): Promise<TaskResponse> {
  const initialRaw = await generateFn(systemPrompt, buildUserPrompt(input));

  try {
    return parseTaskResponse(initialRaw, input);
  } catch (initialError) {
    const validationMessage = initialError instanceof Error ? initialError.message : "Unknown task JSON validation error.";
    const repairedRaw = await generateFn(systemPrompt, buildRepairPrompt(input, initialRaw, validationMessage));
    return parseTaskResponse(repairedRaw, input);
  }
}

function normalizeInput(body: TaskRequest): NormalizedTaskRequest {
  return {
    model: body.model ?? "claude-opus-4-5",
    niveau: body.niveau ?? "A2.1",
    textsorte: body.textsorte ?? "Sachtext",
    zielgruppe: body.zielgruppe ?? "allgemein erwachsen",
    sourceText: body.sourceText ?? "",
    selectedFormats: body.selectedFormats ?? [],
    taskGlobalConfig: {
      taskCount: body.taskGlobalConfig?.taskCount ?? 8,
      outputFormat: "app",
      withSeparateSolutions: body.taskGlobalConfig?.withSeparateSolutions ?? true,
    },
    lueckentextConfig: body.lueckentextConfig ?? {},
    mcqConfig: body.mcqConfig ?? {},
    trueFalseConfig: body.trueFalseConfig ?? {},
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TaskRequest;
    const input = normalizeInput(body);

    if (!input.sourceText.trim()) {
      return new Response(JSON.stringify({ error: "Kein Quelltext vorhanden." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (input.selectedFormats.length === 0) {
      return new Response(JSON.stringify({ error: "Mindestens ein Aufgabenformat ist erforderlich." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const provider: ModelProvider = MODEL_PROVIDERS[input.model] ?? "anthropic";
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    let generateFn: GenerateRawFn;

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY nicht konfiguriert" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const client = new OpenAI({ apiKey });
      generateFn = (system, prompt) => generateWithOpenAI(client, input.model, system, prompt);
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY nicht konfiguriert" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const client = new Anthropic({ apiKey });
      generateFn = (system, prompt) => generateWithAnthropic(client, input.model, system, prompt);
    }

    const result = await generateValidatedTaskResponse(generateFn, systemPrompt, input);

    void storeGeneratedTasks({
      model: input.model,
      provider,
      niveau: input.niveau,
      textsorte: input.textsorte,
      zielgruppe: input.zielgruppe,
      selectedFormats: input.selectedFormats,
      sourceWordCount: input.sourceText.trim().split(/\s+/).filter(Boolean).length,
      requestPayload: input,
      responsePayload: result,
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate tasks error:", error);
    return new Response(JSON.stringify({ error: "Fehler bei der Aufgabengenerierung" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}