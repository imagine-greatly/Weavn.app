import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

export interface MultiPageScanItem {
  url: string;
  path: string;
  score: number;
  scan_id: string;
}

export interface MultiPageWebhookPayload {
  scan_id: string;
  type: "multi";
  page_count: number;
  aggregate_score: number;
  scans: MultiPageScanItem[];
  credits_used: number;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

interface WebhookRow {
  id: string;
  url: string;
  secret: string;
}

export interface WebhookPayload {
  event: "scan.completed" | "scan.failed";
  scan_id: string;
  url: string;
  score: number | null;
  data: Record<string, unknown>;
}

const RETRY_DELAYS_MS = [0, 5 * 60 * 1000, 30 * 60 * 1000];

async function deliverWithRetry(
  row: WebhookRow,
  body: string,
  eventHeader: string
): Promise<void> {
  const signature = createHmac("sha256", row.secret).update(body).digest("hex");

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(row.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Weavn-Event": eventHeader,
          "X-Weavn-Signature": signature,
          "X-Weavn-Attempt": String(attempt + 1),
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) return;

      console.error(`[webhooks] attempt ${attempt + 1} failed for ${row.url}: HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timeout);
      console.error(`[webhooks] attempt ${attempt + 1} error for ${row.url}:`, err instanceof Error ? err.message : err);
    }
  }

  console.error(`[webhooks] all ${RETRY_DELAYS_MS.length} delivery attempts exhausted for ${row.url}`, {
    webhookId: row.id,
    event: eventHeader,
  });
}

export function dispatchMultiPageWebhook(
  apiKeyId: string,
  payload: MultiPageWebhookPayload
): void {
  void (async () => {
    try {
      const supabase = getServiceClient();
      const { data: rows, error } = await supabase
        .from("webhooks")
        .select("id, url, secret")
        .eq("api_key_id", apiKeyId)
        .eq("active", true);

      if (error || !rows || rows.length === 0) return;

      const body = JSON.stringify(payload);

      await Promise.allSettled(
        (rows as WebhookRow[]).map(row => deliverWithRetry(row, body, "scan.completed"))
      );
    } catch (err) {
      console.error("[webhooks] dispatchMultiPageWebhook failed:", err);
    }
  })();
}

export function dispatchWebhook(
  apiKeyId: string,
  payload: WebhookPayload
): void {
  void (async () => {
    try {
      const supabase = getServiceClient();
      const { data: rows, error } = await supabase
        .from("webhooks")
        .select("id, url, secret")
        .eq("api_key_id", apiKeyId)
        .eq("active", true);

      if (error || !rows || rows.length === 0) return;

      const body = JSON.stringify(payload);

      await Promise.allSettled(
        (rows as WebhookRow[]).map(row => deliverWithRetry(row, body, payload.event))
      );
    } catch (err) {
      console.error("[webhooks] dispatchWebhook failed:", err);
    }
  })();
}
