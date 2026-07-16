import assert from "node:assert/strict";
import test from "node:test";
import { getCalendarEvents } from "../src/sources/calendar.mjs";
import { getEmailHighlights } from "../src/sources/gmail.mjs";
import { buildUserPrompt } from "../src/reasoning/prompt.mjs";

const oauth = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("calendar returns null without OAuth credentials", async () => {
  assert.equal(await getCalendarEvents(), null);
});

test("calendar maps timed and all-day events for the next seven days", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("oauth2.googleapis.com/token")) {
      return jsonResponse({ access_token: "access-token", expires_in: 3600 });
    }
    return jsonResponse({
      items: [
        {
          summary: "Project review",
          start: { dateTime: "2026-07-17T09:00:00Z" },
          end: { dateTime: "2026-07-17T10:00:00Z" },
          location: "Online",
        },
        {
          summary: "Submission day",
          start: { date: "2026-07-20" },
          end: { date: "2026-07-21" },
        },
      ],
    });
  };

  const events = await getCalendarEvents({
    oauth,
    fetchImpl,
    now: new Date("2026-07-16T23:00:00Z"),
  });

  assert.deepEqual(events, [
    {
      title: "Project review",
      start: "2026-07-17T09:00:00Z",
      end: "2026-07-17T10:00:00Z",
      location: "Online",
      allDay: false,
    },
    {
      title: "Submission day",
      start: "2026-07-20",
      end: "2026-07-21",
      allDay: true,
    },
  ]);
  const calendarUrl = new URL(requests[1].url);
  assert.equal(calendarUrl.searchParams.get("timeZone"), "Africa/Accra");
  assert.equal(calendarUrl.searchParams.get("singleEvents"), "true");
});

test("gmail returns null without OAuth credentials", async () => {
  assert.equal(await getEmailHighlights(), null);
});

test("gmail maps bounded unread important message metadata", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(String(url));
    if (String(url).includes("oauth2.googleapis.com/token")) {
      return jsonResponse({ access_token: "access-token", expires_in: 3600 });
    }
    if (String(url).includes("/messages?")) {
      return jsonResponse({ messages: [{ id: "message-1", threadId: "thread-1" }] });
    }
    return jsonResponse({
      id: "message-1",
      threadId: "thread-1",
      snippet: "Please review the attached proposal.",
      internalDate: "1784246400000",
      payload: {
        headers: [
          { name: "Subject", value: "Proposal review" },
          { name: "From", value: "Ada <ada@example.com>" },
          { name: "Date", value: "Thu, 16 Jul 2026 12:00:00 +0000" },
        ],
      },
    });
  };

  const messages = await getEmailHighlights({ oauth, fetchImpl });

  assert.deepEqual(messages, [
    {
      subject: "Proposal review",
      from: "Ada <ada@example.com>",
      snippet: "Please review the attached proposal.",
      date: "Thu, 16 Jul 2026 12:00:00 +0000",
      threadId: "thread-1",
    },
  ]);
  const listUrl = new URL(requests[1]);
  assert.equal(listUrl.searchParams.get("maxResults"), "15");
  assert.match(listUrl.searchParams.get("q"), /is:unread/);
  assert.match(listUrl.searchParams.get("q"), /is:important/);
});

test("Google API failures soft-fail both optional sources", async () => {
  const fetchImpl = async () => jsonResponse({ error: "invalid_grant" }, 400);

  assert.equal(await getCalendarEvents({ oauth, fetchImpl }), null);
  assert.equal(await getEmailHighlights({ oauth, fetchImpl }), null);
});

test("briefing prompt includes available Google signals and omits null ones", () => {
  const withGoogle = buildUserPrompt({
    tasks: [],
    calendar: [{ title: "Project review" }],
    gmail: [{ subject: "Proposal review" }],
  });
  assert.match(withGoogle, /Project review/);
  assert.match(withGoogle, /Proposal review/);

  const withoutGoogle = buildUserPrompt({
    tasks: [],
    calendar: null,
    gmail: null,
  });
  assert.doesNotMatch(withoutGoogle, /"calendar"/);
  assert.doesNotMatch(withoutGoogle, /"gmail"/);
});
