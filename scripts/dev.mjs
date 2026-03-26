#!/usr/bin/env node
/**
 * Dev server entry: frees port 3000 (avoids "Another next dev server is already running"),
 * raises file descriptor limit on macOS/Linux (reduces EMFILE / watch errors), then runs `next dev`.
 *
 * If you still see EMFILE: raise the system limit (e.g. macOS `launchctl limit maxfiles`)
 * or set WATCHPACK_POLLING=true for polling-based watching (slower, fewer descriptors).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", ".bin", "next");

async function freePort3000() {
  try {
    const { default: killPort } = await import("kill-port");
    await killPort(3000);
  } catch {
    // Nothing listening or kill-port failed — safe to continue
  }
}

await freePort3000();

const isWin = process.platform === "win32";

if (isWin) {
  const child = spawn(nextBin, ["dev"], {
    stdio: "inherit",
    cwd: root,
    env: {
      ...process.env,
      UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE ?? "64",
    },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  const child = spawn(
    "sh",
    ["-c", `ulimit -n 65536 2>/dev/null; exec "${nextBin}" dev`],
    {
      stdio: "inherit",
      cwd: root,
      env: {
        ...process.env,
        UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE ?? "64",
      },
    }
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}
