type RateLimitState = {
  windowStartedAt: number;
  used: number;
};

const WINDOW_MS = 62_000;
const STATE_KEY = "__zenphoOpenAiImageRateLimitState";

function getState(): RateLimitState {
  const globalWithState = globalThis as typeof globalThis & {
    __zenphoOpenAiImageRateLimitState?: RateLimitState;
  };
  if (!globalWithState[STATE_KEY]) {
    globalWithState[STATE_KEY] = { windowStartedAt: 0, used: 0 };
  }
  return globalWithState[STATE_KEY];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseImageMaxPerMinute(raw: string | undefined): number {
  const n = raw?.trim() ? Number.parseInt(raw, 10) : 5;
  return Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : 5;
}

export async function runOpenAiImageJobs<TJob, TResult>(params: {
  label: string;
  jobs: TJob[];
  maxPerMinute: number;
  run: (job: TJob, index: number) => Promise<TResult>;
}): Promise<TResult[]> {
  const results: TResult[] = [];
  let nextIndex = 0;

  while (nextIndex < params.jobs.length) {
    const state = getState();
    const now = Date.now();
    if (!state.windowStartedAt || now - state.windowStartedAt >= WINDOW_MS) {
      state.windowStartedAt = now;
      state.used = 0;
    }

    const remaining = Math.max(0, params.maxPerMinute - state.used);
    if (remaining <= 0) {
      const waitMs = Math.max(0, WINDOW_MS - (now - state.windowStartedAt));
      console.info(
        `[${params.label}] waiting ${waitMs}ms for shared image rate-limit window`,
      );
      await sleep(waitMs);
      continue;
    }

    const batch = params.jobs.slice(nextIndex, nextIndex + remaining);
    state.used += batch.length;
    console.info(
      `[${params.label}] reserved ${batch.length} image request(s); shared window usage=${state.used}/${params.maxPerMinute}`,
    );

    const batchResults = await Promise.all(
      batch.map((job, i) => params.run(job, nextIndex + i)),
    );
    results.push(...batchResults);
    nextIndex += batch.length;
  }

  return results;
}
