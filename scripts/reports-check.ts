// Unit check for the CSV helper (escaping + structure).
import { toCsv } from "../src/lib/reports/csv";

let ok = true;
const log = (label: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!pass) ok = false;
};

const csv = toCsv(["Name", "Note", "Amount"], [
  ["Aarav", "ok", 100],
  ["Sita, Karki", 'said "hi"', 200],
  ["Line\nbreak", null, undefined],
]);
const lines = csv.split("\r\n");

log("header row present", lines[0] === "Name,Note,Amount");
log("simple row", lines[1] === "Aarav,ok,100");
log("comma is quoted", lines[2].startsWith('"Sita, Karki",'));
log("double-quotes are escaped", lines[2].includes('"said ""hi"""'));
log("newline cell is quoted", csv.includes('"Line\nbreak"'));
log("null/undefined become empty", lines[3].endsWith(",,"));
log("CRLF line endings", csv.includes("\r\n"));

console.log(ok ? "\n✅ REPORTS CSV CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
if (!ok) process.exit(1);
