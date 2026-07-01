import type { RawResearchItem, SourceAdapter, SourceAdapterResult } from "../types.js";

const TIMEOUT_MS = 8000;
const SOURCE_ID = "stackexchange";

interface StackExchangeQuestion {
  title?: string;
  link?: string;
  creation_date?: number;
  body?: string;
}

interface StackExchangeResponse {
  items?: StackExchangeQuestion[];
}

async function fetchStackExchange(windowDays: number): Promise<SourceAdapterResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const fromDate = Math.floor((Date.now() - windowDays * 24 * 60 * 60 * 1000) / 1000);
    const params = new URLSearchParams({
      order: "desc",
      sort: "creation",
      q: "startup product",
      site: "stackoverflow",
      fromdate: String(fromDate),
      pagesize: "25",
    });
    const key = process.env.STACK_EXCHANGE_KEY;
    if (key) params.set("key", key);

    const url = `https://api.stackexchange.com/2.3/search/advanced?${params.toString()}`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, error: `Stack Exchange search failed with status ${response.status}` };
    }

    const body = (await response.json()) as StackExchangeResponse;
    const items: RawResearchItem[] = (body.items ?? []).map((item) => ({
      title: item.title ?? "untitled-question",
      url: item.link ?? "https://stackoverflow.com",
      snippet: item.body,
      publishedAt: item.creation_date ? new Date(item.creation_date * 1000).toISOString() : undefined,
      sourceId: SOURCE_ID,
    }));

    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown Stack Exchange fetch error" };
  } finally {
    clearTimeout(timer);
  }
}

export const stackExchangeSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: true,
  fetch: fetchStackExchange,
};
