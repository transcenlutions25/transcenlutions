const MAX_RESPONSE_TEXT = 800;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function providerMessage(value: unknown): string {
  if (isRecord(value)) {
    const error = value.error;
    if (typeof error === "string") return error.slice(0, MAX_RESPONSE_TEXT);
    if (isRecord(error)) {
      const message = error.message;
      if (typeof message === "string") return message.slice(0, MAX_RESPONSE_TEXT);
      const code = error.code;
      if (typeof code === "string" || typeof code === "number") return String(code).slice(0, 120);
    }
    const message = value.message;
    if (typeof message === "string") return message.slice(0, MAX_RESPONSE_TEXT);
  }
  return "Provider rejected the request.";
}

export async function responseJson(response: Response, provider: string): Promise<Record<string, unknown>> {
  const text = (await response.text()).slice(0, 16_000);
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, MAX_RESPONSE_TEXT) };
    }
  }
  if (!response.ok) {
    throw new Error(`${provider} returned ${response.status}: ${providerMessage(data)}`);
  }
  return isRecord(data) ? data : {};
}

export async function postForm(
  url: string,
  fields: Record<string, string>,
  provider: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  return responseJson(response, provider);
}

export function externalId(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return undefined;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, MAX_RESPONSE_TEXT) : "Publishing failed.";
}
