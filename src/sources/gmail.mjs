import { fetchGoogleJson, hasGoogleOauth } from "./google-auth.mjs";

const GMAIL_MESSAGES_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const MAX_MESSAGES = 15;
const QUERY = "is:unread (is:important OR in:inbox) -category:promotions";

function headerValue(message, name) {
  return (
    message.payload?.headers?.find(
      (header) => header.name.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

export async function getEmailHighlights({
  oauth,
  fetchImpl = fetch,
} = {}) {
  if (!hasGoogleOauth(oauth)) return null;

  try {
    const listUrl = new URL(GMAIL_MESSAGES_URL);
    listUrl.search = new URLSearchParams({
      q: QUERY,
      maxResults: String(MAX_MESSAGES),
    });
    const listed = await fetchGoogleJson(listUrl, { oauth, fetchImpl });
    const messages = listed.messages ?? [];

    return Promise.all(
      messages.map(async ({ id, threadId }) => {
        const detailUrl = new URL(`${GMAIL_MESSAGES_URL}/${id}`);
        detailUrl.search = new URLSearchParams({
          format: "metadata",
          metadataHeaders: "Subject",
        });
        detailUrl.searchParams.append("metadataHeaders", "From");
        detailUrl.searchParams.append("metadataHeaders", "Date");
        const message = await fetchGoogleJson(detailUrl, { oauth, fetchImpl });
        return {
          subject: headerValue(message, "Subject") || "(No subject)",
          from: headerValue(message, "From") || "(Unknown sender)",
          snippet: message.snippet ?? "",
          date:
            headerValue(message, "Date") ||
            (message.internalDate
              ? new Date(Number(message.internalDate)).toISOString()
              : null),
          threadId: message.threadId ?? threadId,
        };
      })
    );
  } catch (err) {
    console.error("Gmail source failed, continuing without it:", err.message);
    return null;
  }
}
