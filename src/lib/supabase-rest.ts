import { getSupabaseEnv } from "@/lib/env";

type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE" | "HEAD";

function parseCount(contentRange: string | null) {
  if (!contentRange) return 0;

  const [, total] = contentRange.split("/");
  const parsed = Number(total);

  return Number.isFinite(parsed) ? parsed : 0;
}

async function parseError(response: Response) {
  const text = await response.text();

  if (!text) {
    return `Supabase respondeu com status ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(text) as { message?: string; error?: string };
    return parsed.message || parsed.error || text;
  } catch {
    return text;
  }
}

export async function supabaseRest<T>(
  path: string,
  options?: {
    method?: RequestMethod;
    body?: unknown;
    headers?: Record<string, string>;
  },
) {
  const env = getSupabaseEnv();
  const method = options?.method || "GET";

  const response = await fetch(`${env.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: `Bearer ${env.serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const count = parseCount(response.headers.get("content-range"));

  if (method === "HEAD" || response.status === 204) {
    return { data: null as T, count };
  }

  const text = await response.text();
  if (!text) return { data: null as T, count };

  return { data: JSON.parse(text) as T, count };
}
