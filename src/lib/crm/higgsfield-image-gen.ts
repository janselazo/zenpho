const DEFAULT_HIGGSFIELD_URL = "https://api.higgsfield.ai/v1/images/generations";

type HiggsfieldResponse = {
  url?: string;
  image_url?: string;
  output_url?: string;
  data?: Array<{ url?: string; image_url?: string; output_url?: string }>;
  images?: Array<{ url?: string; image_url?: string; output_url?: string }>;
  error?: { message?: string } | string;
  message?: string;
};

export type HiggsfieldImageResult =
  | { ok: true; thumbnailUrl: string; providerPayload: unknown }
  | { ok: false; error: string; missingKey?: boolean };

function extractUrl(payload: HiggsfieldResponse): string | null {
  const direct = payload.url ?? payload.image_url ?? payload.output_url;
  if (direct?.trim()) return direct.trim();

  const firstData = payload.data?.[0];
  const dataUrl = firstData?.url ?? firstData?.image_url ?? firstData?.output_url;
  if (dataUrl?.trim()) return dataUrl.trim();

  const firstImage = payload.images?.[0];
  const imageUrl = firstImage?.url ?? firstImage?.image_url ?? firstImage?.output_url;
  return imageUrl?.trim() || null;
}

function providerError(payload: HiggsfieldResponse, fallback: string): string {
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
  if (
    payload.error &&
    typeof payload.error === "object" &&
    payload.error.message?.trim()
  ) {
    return payload.error.message.trim();
  }
  if (payload.message?.trim()) return payload.message.trim();
  return fallback;
}

export async function generateHiggsfieldThumbnail(input: {
  prompt: string;
}): Promise<HiggsfieldImageResult> {
  const apiKey = process.env.HIGGSFIELD_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      missingKey: true,
      error: "HIGGSFIELD_API_KEY is not configured.",
    };
  }

  const endpoint = process.env.HIGGSFIELD_API_URL?.trim() || DEFAULT_HIGGSFIELD_URL;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model: "nano_banana_2",
        prompt: input.prompt,
        aspect_ratio: "9:16",
        response_format: "url",
        n: 1,
      }),
    });

    const payload = (await res.json().catch(() => ({}))) as HiggsfieldResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: providerError(payload, `Higgsfield request failed with status ${res.status}.`),
      };
    }

    const thumbnailUrl = extractUrl(payload);
    if (!thumbnailUrl) {
      return {
        ok: false,
        error: "Higgsfield returned no image URL.",
      };
    }

    return { ok: true, thumbnailUrl, providerPayload: payload };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Higgsfield request failed.",
    };
  }
}
