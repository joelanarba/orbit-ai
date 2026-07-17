/**
 * Safely render a markdown focus fragment with **bold** spans.
 * Avoids dangerouslySetInnerHTML.
 */
import { splitFocusMarks } from "./focusMarks.js";

export function FocusText({ text, className }) {
  if (!text) return null;
  const parts = splitFocusMarks(text);
  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.type === "strong" ? <strong key={i}>{part.value}</strong> : <span key={i}>{part.value}</span>
      )}
    </p>
  );
}
