/**
 * AI Reports: the multi-step agent.
 *
 * For questions one report cannot answer (comparisons, several reports, one named person),
 * the AI may call run_report several times, then writes the answer from the results.
 *
 * Safety: every call goes through the same validateSpec + runSpec as a normal report, so the
 * organisation lock, the user's role/branch scope, hidden sensitive columns and row limits all
 * still apply, and the AI can only use the datasets this user is allowed. It cannot write data.
 *
 * What the AI sees of each result: totals and breakdowns (aiPayload). Individual records are
 * only passed when the report narrowed to a few people (<= PERSON_ROWS_MAX rows), which is
 * what "tell me about this student" needs; larger lists stay on screen only.
 */
import type { AccessContext } from './access.js';
import { type DatasetDef } from './datasets.js';
import { ReportError, runSpec, validateSpec, type ReportResult } from './compiler.js';
import { geminiForAgent, languageRule, promptContext, responseSchema, SPEC_RULES, todayLocal, type Language } from './provider.js';
import { aiPayload } from './voice.js';

const MAX_STEPS = 5;
const PERSON_ROWS_MAX = 10;
const STEP_TIMEOUT_MS = parseInt(process.env.AI_AGENT_STEP_TIMEOUT_MS || '25000', 10);

export interface AgentOutput { answer: string; results: (ReportResult & { spec: any; access?: string })[] }

function toolFor(allowed: Record<string, DatasetDef>) {
  const { properties, required } = responseSchema(Object.keys(allowed)) as { properties: Record<string, unknown>; required: string[] };
  const { intent: _i, reply: _r, ...specProps } = properties;
  void _i; void _r;
  return {
    name: 'run_report',
    description: 'Run one report on the user\'s ERP data and get its totals (or the records, when it is narrowed to a few people). Call it as many times as the question needs, e.g. once per thing to compare.',
    parametersJsonSchema: { type: 'object', properties: specProps, required: required.filter((r) => r !== 'intent') },
  };
}

function forModel(spec: any, result: ReportResult) {
  const base: any = aiPayload(spec, result);
  if (spec.mode === 'list' && result.rows.length > 0 && result.rows.length <= PERSON_ROWS_MAX && base.rows === undefined) {
    const labelled = (r: Record<string, any>) => Object.fromEntries(result.columns.map((c) => [c.label, r[c.key]]));
    return { ...base, kind: 'a few records (narrowed to specific people)', rows: result.rows.map(labelled) };
  }
  return base;
}

export async function runAgent(opts: {
  prompt: string; ctx: AccessContext; allowed: Record<string, DatasetDef>; catalog: string;
  previousSpec?: unknown; language?: Language; accessLabelFor: (ds: DatasetDef) => string;
}): Promise<AgentOutput> {
  const { gemini, ThinkingLevel, ApiError, models } = await geminiForAgent();
  const system = `You answer questions from staff of an education ERP using ONLY the run_report tool. You may call it several times (at most ${MAX_STEPS - 1} calls) to compare, combine or calculate; then write the final answer.${languageRule(opts.language, 'your answer')}
${promptContext({ catalog: opts.catalog, scopeLabel: opts.ctx.scopeLabel })}Today is ${todayLocal()}.

How to build each report (run_report arguments):
${SPEC_RULES}
Rules for the final answer:
- Plain text, 2-5 short sentences, no markdown, no lists. Lead with the answer, then the key numbers, then one observation.
- Use ONLY numbers returned by the tool; do the arithmetic (differences, ratios, percentages) yourself and say it plainly. Never invent numbers or names.
- For a question about one named person, find them by filtering the right dataset with their name (op "contains") and report what the data shows. If several people match, say so and ask which one.
- If the data can't answer it, say what is missing and what you can report instead. Stay within this ERM's data; for anything else say you can only help with ERM data.
- The charts and tables of every report you run are shown to the user, so don't list rows.`;

  const tool = toolFor(opts.allowed);
  const contents: any[] = [{ role: 'user', parts: [{ text: opts.previousSpec ? `Previous report on screen: ${JSON.stringify(opts.previousSpec)}\n\nQuestion: ${opts.prompt}` : opts.prompt }] }];
  const results: AgentOutput['results'] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const lastStep = step === MAX_STEPS - 1;
    let res: any;
    let lastErr: unknown;
    for (const model of models) {
      const levels = model.startsWith('gemini-2.') ? [null] : [ThinkingLevel.LOW, ThinkingLevel.MINIMAL];
      for (const level of levels) {
        try {
          res = await gemini.models.generateContent({
            model,
            contents,
            config: {
              abortSignal: AbortSignal.timeout(STEP_TIMEOUT_MS),
              systemInstruction: system,
              tools: lastStep ? undefined : [{ functionDeclarations: [tool] }],
              maxOutputTokens: 600,
              thinkingConfig: level ? { thinkingLevel: level } : { thinkingBudget: 0 },
            },
          });
          break;
        } catch (err: any) {
          lastErr = err;
          if (err instanceof ApiError && err.status === 400 && /thinking level/i.test(err.message)) continue;
          break;
        }
      }
      if (res) break;
    }
    if (!res) {
      console.error('[ai-reports] agent step failed', lastErr instanceof Error ? lastErr.message.slice(0, 200) : lastErr);
      throw new ReportError(502, 'The AI could not finish that question. Please try again or ask it in a simpler way.');
    }

    const calls = res.functionCalls as { name: string; args: any }[] | undefined;
    if (!calls || calls.length === 0 || lastStep) {
      const answer = String(res.text || '').trim();
      if (!answer) throw new ReportError(502, 'The AI returned an empty answer. Please rephrase and try again.');
      return { answer, results };
    }

    // Keep the model's own turn (it carries the thought signatures Gemini 3 needs), then answer each call
    contents.push(res.candidates?.[0]?.content ?? { role: 'model', parts: calls.map((c) => ({ functionCall: c })) });
    const parts: any[] = [];
    for (const call of calls.slice(0, 3)) {
      if (call.name !== 'run_report') { parts.push({ functionResponse: { name: call.name, response: { error: 'Unknown tool' } } }); continue; }
      try {
        const { spec, ds } = validateSpec(call.args, opts.allowed);
        const result = await runSpec(spec, ds, opts.ctx);
        results.push({ spec, ...result, access: opts.accessLabelFor(ds) });
        parts.push({ functionResponse: { name: 'run_report', response: forModel(spec, result) } });
      } catch (err) {
        const msg = err instanceof ReportError ? err.message : 'The report could not be built.';
        parts.push({ functionResponse: { name: 'run_report', response: { error: msg } } });
      }
    }
    contents.push({ role: 'user', parts });
  }
  throw new ReportError(502, 'The AI could not finish that question. Please try again.');
}
