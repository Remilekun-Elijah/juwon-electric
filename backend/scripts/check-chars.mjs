// Checklist G15: tracked and new text files under backend/ must not contain control (Cc) or
// format (Cf) characters other than tab, LF and CR. Such characters in source usually come
// from tooling that turned a "\u" escape into the real character, which silently changes a
// regex or a string. Write escapes in source; JSON fixtures keep them escaped.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const backend = fileURLToPath(new URL("..", import.meta.url));
const TEXT_FILE = /\.(c|m)?js$|\.json$|\.sql$|\.md$|\.toml$|\.ya?ml$|\.txt$|\.html$/;
const ALLOWED = new Set(["\t", "\n", "\r"]);
const SUSPICIOUS = new RegExp("[\\p{Cc}\\p{Cf}]", "u");

const git = (args) =>
  execFileSync("git", args, { cwd: backend, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

const files = [...new Set([...git(["ls-files"]), ...git(["ls-files", "--others", "--exclude-standard"])])].filter(
  (file) => TEXT_FILE.test(file)
);

let found = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(`${backend}/${file}`, "utf8");
  } catch {
    continue; // deleted in the working tree
  }
  let line = 1;
  for (const char of text) {
    if (char === "\n") line += 1;
    if (ALLOWED.has(char) || !SUSPICIOUS.test(char)) continue;
    found += 1;
    console.error(`${file}:${line}: U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`);
  }
}

if (found) {
  console.error(`check-chars: ${found} control/format character(s) in ${files.length} files.`);
  process.exit(1);
}
console.log(`check-chars: ${files.length} files clean.`);
