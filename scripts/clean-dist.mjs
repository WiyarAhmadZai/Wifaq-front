// Empty dist/ before `vite build`, tolerating the Windows file-lock race.
//
// Vite clears the out dir with a single fs.rmSync() and no retries. On
// Windows that fails intermittently with
//   EPERM, Permission denied: \\?\...\dist\assets
// because something is still holding one of the files the PREVIOUS build
// wrote a moment ago — Defender scanning it, the Search Indexer reading it, a
// sync client uploading it. The hold lasts milliseconds and lands on a
// different file each time, so the build that fails would have succeeded a
// second later. Node's own rmSync can wait that out; Vite just doesn't ask it
// to. This runs as `prebuild`, so by the time Vite looks there is nothing
// left for it to delete.
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
if (!existsSync(dist)) process.exit(0);

try {
  // Up to ~5 s of patience: 20 attempts, 250 ms apart, each retry only on the
  // transient codes (EBUSY / EPERM / ENOTEMPTY) that a passing scanner causes.
  rmSync(dist, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
} catch (err) {
  console.error(
    `\nCould not empty ${dist} — ${err.code || err.message}.\n` +
    "Something is holding a file in it open. Close any `vite preview`, a file " +
    "explorer or editor tab inside dist/, or wait a few seconds and run the build again.\n",
  );
  process.exit(1);
}
