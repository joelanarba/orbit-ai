// SES delivery: plain-text body is the raw markdown; HTML body is a minimal
// conversion (headings, bold, lists) so it reads cleanly in Gmail.
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({});

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function markdownToHtml(markdown) {
  const blocks = [];
  let list = null;
  const flushList = () => {
    if (list) {
      blocks.push(`<${list.tag}>${list.items.join("")}</${list.tag}>`);
      list = null;
    }
  };

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{1,3})\s+(.*)/);
    const bullet = trimmed.match(/^[-*]\s+(.*)/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)/);

    if (heading) {
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      const tag = bullet ? "ul" : "ol";
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(`<li>${inlineMd((bullet ?? numbered)[1])}</li>`);
    } else if (trimmed) {
      flushList();
      blocks.push(`<p>${inlineMd(trimmed)}</p>`);
    } else {
      flushList();
    }
  }
  flushList();

  return `<html><body style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;padding:16px;color:#222;line-height:1.5">${blocks.join(
    "\n"
  )}</body></html>`;
}

export async function sendBriefing({ to, from, subject, markdown }) {
  const result = await ses.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: markdown, Charset: "UTF-8" },
          Html: { Data: markdownToHtml(markdown), Charset: "UTF-8" },
        },
      },
    })
  );
  return result.MessageId;
}
