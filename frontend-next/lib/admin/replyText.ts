// Extracts the newest part of an email reply, dropping the quoted history that
// mail clients append ("On <date>, <name> wrote:", "> quoted" lines, Outlook
// "-----Original Message-----" / "From: ... Sent: ..." headers). Line-based and
// linear, so it's safe on long inbound messages. Port of the Vite admin's utils/replyText.js.

const MAX_HEADER_LINES = 4;
const MAX_HEADER_LENGTH = 500;

const ORIGINAL_MESSAGE = /^-{2,}\s*original message\s*-{2,}$/i;
const OUTLOOK_RULE = /^_{10,}$/;
const OUTLOOK_FROM = /^(from|de|von):\s/i;
const OUTLOOK_FIELD = /^(sent|date|to|subject|envoyé|gesendet):\s/i;
const TRAILING_SIGNATURE = /^sent from my [\w\s]{1,40}$/i;

const isReplyHeader = (lines: string[], index: number) => {
  if (!/^on\s/i.test(lines[index].trim())) return false;
  let joined = "";
  for (let offset = 0; offset < MAX_HEADER_LINES && index + offset < lines.length; offset += 1) {
    joined = `${joined} ${lines[index + offset].trim()}`.trim();
    if (joined.length > MAX_HEADER_LENGTH) return false;
    if (/wrote:$/i.test(joined)) return true;
  }
  return false;
};

const isOutlookHeader = (lines: string[], index: number) => {
  if (!OUTLOOK_FROM.test(lines[index].trim())) return false;
  for (let offset = 1; offset <= MAX_HEADER_LINES && index + offset < lines.length; offset += 1) {
    if (OUTLOOK_FIELD.test(lines[index + offset].trim())) return true;
  }
  return false;
};

// Index of the last non-empty line that isn't a "> quote"; -1 if there is none.
const lastUnquotedLine = (lines: string[]) => {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (line && !line.startsWith(">")) return i;
  }
  return -1;
};

export const extractLatestReply = (text: unknown): string => {
  const full = String(text || "").replace(/\r\n?/g, "\n");
  const lines = full.split("\n");

  const lastUnquoted = lastUnquotedLine(lines);
  let cut = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (
      ORIGINAL_MESSAGE.test(line) ||
      OUTLOOK_RULE.test(line) ||
      isReplyHeader(lines, i) ||
      isOutlookHeader(lines, i) ||
      (line.startsWith(">") && i > lastUnquoted)
    ) {
      cut = i;
      break;
    }
  }

  const kept = lines.slice(0, cut);
  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  if (kept.length && TRAILING_SIGNATURE.test(kept[kept.length - 1].trim())) kept.pop();
  const latest = kept.join("\n").trim();

  // Bottom-posted replies (new text under the quote) would come out empty; show everything then.
  return latest || full.trim();
};
