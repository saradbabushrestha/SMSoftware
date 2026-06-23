// Runs every data-layer check + smoke as one suite. Exits non-zero if any fail.
//   npm test
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const files = [
  ...readdirSync("scripts").filter((f) => f.endsWith("-check.ts")).sort(),
  "smoke.ts",
];

let failed = 0;
const t0 = Date.now();

for (const f of files) {
  const res = spawnSync(process.execPath, ["--env-file=.env", "--import", "tsx", `scripts/${f}`], { encoding: "utf8" });
  const ok = res.status === 0;
  if (!ok) failed++;
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`.trim();
  const summary =
    out.split("\n").filter((l) => /✅|❌|PASSED|FAILED/.test(l)).pop() ??
    (ok ? "ok" : out.split("\n").pop() ?? "FAILED");
  console.log(`${ok ? "✓" : "✗"} ${f.padEnd(26)} ${summary}`);
  if (!ok && out) console.log(out.split("\n").slice(-6).map((l) => `    ${l}`).join("\n"));
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(failed === 0 ? `\n✅ ALL ${files.length} CHECK SUITES PASSED (${secs}s)` : `\n❌ ${failed}/${files.length} SUITES FAILED (${secs}s)`);
process.exit(failed === 0 ? 0 : 1);
