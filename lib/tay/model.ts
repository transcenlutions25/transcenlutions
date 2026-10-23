/**
 * Model provider adapter.
 *
 * Transcenlutions Connector for language models is provider-neutral: the
 * workspace talks one OpenAI-compatible chat shape and reports exactly which
 * provider answered. Nothing here invents a model. With no provider
 * configured, Tay runs its built-in structured drafting and the workspace says
 * so in the interface.
 *
 * Free options that need no account:
 *   - Ollama on this machine (`ollama serve`, then `TAY_MODEL_PROVIDER=ollama`)
 *   - any local OpenAI-compatible server (llama.cpp, LM Studio, vLLM)
 */
import type { ModelStatus, ModelProviderId } from "./types";

interface ProviderConfig {
  provider: ModelProviderId;
  label: string;
  baseUrl: string | null;
  model: string | null;
  apiKey: string | null;
}

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:7b";

export function providerConfig(): ProviderConfig {
  const requested = (process.env.TAY_MODEL_PROVIDER || "").trim().toLowerCase();
  const ollamaUrl = (process.env.TAY_OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, "");
  const localUrl = process.env.TAY_MODEL_BASE_URL?.replace(/\/$/, "") || null;

  if (requested === "ollama" || (requested === "" && process.env.TAY_OLLAMA_URL)) {
    return {
      provider: "ollama",
      label: "Ollama (local machine)",
      baseUrl: ollamaUrl,
      model: process.env.TAY_MODEL || DEFAULT_OLLAMA_MODEL,
      apiKey: null,
    };
  }
  if (requested === "openai_compatible" || localUrl) {
    return {
      provider: "openai_compatible",
      label: "OpenAI-compatible endpoint",
      baseUrl: localUrl,
      model: process.env.TAY_MODEL || null,
      apiKey: process.env.TAY_MODEL_API_KEY || null,
    };
  }
  return { provider: "none", label: "No model provider configured", baseUrl: null, model: null, apiKey: null };
}

export interface ModelReply {
  ok: boolean;
  text: string;
  provider: ModelProviderId;
  model: string | null;
  detail: string;
  latencyMs: number;
}

/** Reaches the configured provider. Never throws: callers fall back honestly. */
export async function complete(input: {
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<ModelReply> {
  const config = providerConfig();
  const started = Date.now();
  if (config.provider === "none" || !config.baseUrl || !config.model) {
    return {
      ok: false,
      text: "",
      provider: config.provider,
      model: config.model,
      detail: "No model provider is configured, so Tay used its built-in structured draft.",
      latencyMs: 0,
    };
  }

  const url =
    config.provider === "ollama"
      ? `${config.baseUrl}/v1/chat/completions`
      : `${config.baseUrl}/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 120_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        temperature: 0.3,
        max_tokens: input.maxTokens ?? 1200,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        text: "",
        provider: config.provider,
        model: config.model,
        detail: `The model provider answered ${response.status}. Falling back to the built-in draft.`,
        latencyMs: Date.now() - started,
      };
    }
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return {
        ok: false,
        text: "",
        provider: config.provider,
        model: config.model,
        detail: "The model provider returned an empty answer. Falling back to the built-in draft.",
        latencyMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      text,
      provider: config.provider,
      model: config.model,
      detail: `${config.label} · ${config.model}`,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      text: "",
      provider: config.provider,
      model: config.model,
      detail: aborted
        ? "The model provider did not answer in time. Falling back to the built-in draft."
        : `The model provider could not be reached (${error instanceof Error ? error.message : "unknown error"}). Falling back to the built-in draft.`,
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Live status for the interface, checked against the provider itself. */
export async function modelStatus(timeoutMs = 1500): Promise<ModelStatus> {
  const config = providerConfig();
  const awaiting = [
    "Model-written drafting and open-ended reasoning",
    "Image, video and voice generation",
    "Hosted multi-user model routing and spend controls",
  ];
  if (config.provider === "none" || !config.baseUrl) {
    return {
      provider: "none",
      label: "Built-in drafts only",
      connected: false,
      model: null,
      baseUrl: null,
      detail:
        "No model provider is configured. Tay still opens projects, plans work, edits files, runs approved tasks and saves results; drafting uses the built-in structured writer.",
      awaitingConfiguration: awaiting,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const probe =
      config.provider === "ollama"
        ? await fetch(`${config.baseUrl}/api/tags`, { signal: controller.signal, cache: "no-store" })
        : await fetch(`${config.baseUrl}/models`, {
            headers: config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {},
            signal: controller.signal,
            cache: "no-store",
          });
    if (!probe.ok) {
      return {
        provider: config.provider,
        label: config.label,
        connected: false,
        model: config.model,
        baseUrl: config.baseUrl,
        detail: `Configured but not reachable (HTTP ${probe.status}). Tay is using the built-in structured drafts.`,
        awaitingConfiguration: awaiting,
      };
    }
    const body = (await probe.json()) as { models?: { name?: string }[]; data?: { id?: string }[] };
    const names = (body.models?.map((entry) => entry.name) ?? body.data?.map((entry) => entry.id) ?? []).filter(
      (name): name is string => Boolean(name),
    );
    const hasModel = !config.model || names.includes(config.model);
    return {
      provider: config.provider,
      label: config.label,
      connected: hasModel,
      model: config.model,
      baseUrl: config.baseUrl,
      detail: hasModel
        ? `Connected to ${config.label}. Answers are generated by ${config.model}.`
        : `${config.label} is reachable but does not have ${config.model} pulled. Run: ollama pull ${config.model}`,
      awaitingConfiguration: awaiting,
    };
  } catch (error) {
    return {
      provider: config.provider,
      label: config.label,
      connected: false,
      model: config.model,
      baseUrl: config.baseUrl,
      detail: `Configured but not reachable (${error instanceof Error ? error.message : "unknown error"}). Tay is using the built-in structured drafts.`,
      awaitingConfiguration: awaiting,
    };
  } finally {
    clearTimeout(timeout);
  }
}
