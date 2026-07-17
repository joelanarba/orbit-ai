// Parse the fixed five-section Orbit briefing markdown contract.
// Falls back to { valid: false } when sections cannot be extracted.

const SECTION_PATTERNS = [
  { key: "focus", pattern: /##\s*Focus\s*\n([\s\S]*?)(?=\n##\s|$)/i },
  {
    key: "top3",
    pattern: /##\s*Top 3(?:\s*Priorities)?\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  },
  { key: "deadlineRadar", pattern: /##\s*Deadline Radar\s*\n([\s\S]*?)(?=\n##\s|$)/i },
  { key: "staleAlerts", pattern: /##\s*Stale Alerts\s*\n([\s\S]*?)(?=\n##\s|$)/i },
  { key: "quickWins", pattern: /##\s*Quick Wins\s*\n([\s\S]*?)(?=\n##\s|$)/i },
];

/** Strip the H1 and any intro paragraph before the first ## section. */
function extractIntro(markdown) {
  const withoutH1 = markdown.replace(/^#\s+[^\n]+\n+/, "");
  const firstSection = withoutH1.search(/\n##\s/);
  if (firstSection === -1) return withoutH1.trim();
  return withoutH1.slice(0, firstSection).trim();
}

/** Parse numbered list items from Top 3 section. */
export function parseTop3Items(text) {
  if (!text) return [];
  const items = [];
  const lines = text.trim().split("\n");
  let current = null;

  for (const line of lines) {
    const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*(?:\s*[-–—]\s*(.+))?$/);
    if (match) {
      if (current) items.push(current);
      current = { title: match[1].trim(), rationale: (match[2] ?? "").trim() };
      continue;
    }
    const plain = line.match(/^\d+\.\s+(.+)$/);
    if (plain) {
      if (current) items.push(current);
      const body = plain[1].trim();
      const dash = body.match(/^(.+?)\s*[-–—]\s*(.+)$/);
      current = dash
        ? { title: dash[1].replace(/\*\*/g, "").trim(), rationale: dash[2].trim() }
        : { title: body.replace(/\*\*/g, "").trim(), rationale: "" };
    }
  }
  if (current) items.push(current);
  return items;
}

/** Parse bullet list items from a section body. */
export function parseBulletItems(text) {
  if (!text) return [];
  return text
    .trim()
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

/**
 * @returns {{
 *   valid: boolean,
 *   intro: string,
 *   focus: string,
 *   top3: { title: string, rationale: string }[],
 *   deadlineRadar: string[],
 *   staleAlerts: string[],
 *   quickWins: string[],
 * }}
 */
export function parseBriefingSections(markdown) {
  if (!markdown || typeof markdown !== "string") {
    return { valid: false, intro: "", focus: "", top3: [], deadlineRadar: [], staleAlerts: [], quickWins: [] };
  }

  const sections = {};
  for (const { key, pattern } of SECTION_PATTERNS) {
    const match = markdown.match(pattern);
    sections[key] = match ? match[1].trim() : "";
  }

  const top3 = parseTop3Items(sections.top3);
  const hasRequired = sections.focus && top3.length > 0;

  return {
    valid: Boolean(hasRequired),
    intro: extractIntro(markdown),
    focus: sections.focus,
    top3,
    deadlineRadar: parseBulletItems(sections.deadlineRadar),
    staleAlerts: parseBulletItems(sections.staleAlerts),
    quickWins: parseBulletItems(sections.quickWins),
  };
}

/** Count actionable priorities for the greeting line. */
export function attentionCount(parsed) {
  if (!parsed?.valid) return null;
  return parsed.top3.length;
}
