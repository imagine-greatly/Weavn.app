import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

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

      for (const row of rows as WebhookRow[]) {
        const signature = createHmac("sha256", row.secret)
          .update(body)
          .digest("hex");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        fetch(row.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WebDoc-Event": payload.event,
            "X-WebDoc-Signature": signature,
          },
          body,
          signal: controller.signal,
        })
          .catch((err: unknown) =>
            console.error(`[webhooks] delivery failed for ${row.url}:`, err)
          )
          .finally(() => clearTimeout(timeout));
      }
    } catch (err) {
      console.error("[webhooks] dispatchWebhook failed:", err);
    }
  })();
}
