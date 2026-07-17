/**
 * Split a markdown fragment that may contain **bold** markers into parts.
 * @param {string} text
 * @returns {{ type: "text" | "strong", value: string }[]}
 */
export function splitFocusMarks(text) {
  if (!text) return [];
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    parts.push({ type: "strong", value: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts;
}
