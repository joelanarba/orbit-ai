// Public, synthetic data only. This module must never import the live API client.
export const demoTasks = [
  {
    id: "demo-01",
    title: "Publish the Atlas onboarding walkthrough",
    deadline: "2026-07-17",
    importance: 5,
    status: "in_progress",
    category: "kairo-labs",
    effort: "deep",
  },
  {
    id: "demo-02",
    title: "Send speaker briefing notes to the stage team",
    deadline: "2026-07-18",
    importance: 5,
    status: "in_progress",
    category: "tedxucc",
    effort: "normal",
  },
  {
    id: "demo-03",
    title: "Review the Cloud Club workshop runbook",
    deadline: "2026-07-19",
    importance: 4,
    status: "todo",
    category: "aws-sbgl",
    effort: "normal",
  },
  {
    id: "demo-04",
    title: "Finish distributed systems problem set",
    deadline: "2026-07-20",
    importance: 4,
    status: "todo",
    category: "coursework",
    effort: "deep",
  },
  {
    id: "demo-05",
    title: "Confirm room allocation for community meetup",
    deadline: "2026-07-18",
    importance: 3,
    status: "blocked",
    category: "citsa",
    effort: "quick",
  },
  {
    id: "demo-06",
    title: "Annotate three papers on agent memory",
    deadline: "2026-07-23",
    importance: 4,
    status: "todo",
    category: "research",
    effort: "deep",
  },
  {
    id: "demo-07",
    title: "Prepare Spring service migration questions",
    deadline: "2026-07-21",
    importance: 3,
    status: "todo",
    category: "amalitech",
    effort: "normal",
  },
  {
    id: "demo-08",
    title: "Archive last month's event photos",
    deadline: null,
    importance: 2,
    status: "todo",
    category: "general",
    effort: "quick",
  },
  {
    id: "demo-09",
    title: "Share the volunteer check-in template",
    deadline: "2026-07-16",
    importance: 3,
    status: "done",
    category: "citsa",
    effort: "quick",
    completedAt: "2026-07-16T16:42:00.000Z",
  },
];

const markdown = `# Orbit Briefing

Make the Atlas walkthrough the anchor for the morning. It unblocks tomorrow's reviewer handoff and needs a focused writing block before messages take over.

## Focus

Protect 90 minutes for the **Atlas onboarding walkthrough**. Draft the complete path first, then make one clarity pass against the reviewer checklist.

## Top 3

1. **Publish the Atlas onboarding walkthrough** - due today, high impact, deep work.
2. **Send speaker briefing notes to the stage team** - due tomorrow and several people are waiting on it.
3. **Review the Cloud Club workshop runbook** - due Sunday; resolve the open deployment question while the context is fresh.

## Deadline Radar

- **Today:** Atlas onboarding walkthrough.
- **Tomorrow:** speaker notes and meetup room confirmation.
- **Next three days:** Cloud Club runbook, distributed systems problem set, and Spring migration questions.

## Stale Alerts

- **northstar-studio/harbor-notes** has been quiet for 19 days with one open pull request.
- **northstar-studio/field-kit** has a failing CI run and needs a quick ownership check.
- The meetup room task is blocked on a reply from the venue coordinator.

## Quick Wins

- Archive last month's event photos.
- Reply to the venue coordinator with the final attendee estimate.
- Add the missing environment note to the Cloud Club runbook.`;

export const demoReport = {
  date: "2026-07-17",
  generatedAt: "2026-07-17T06:01:24.000Z",
  markdown,
  signals: {
    taskCount: demoTasks.filter((task) => task.status !== "done").length,
    repoCount: 12,
    staleRepos: [
      { repo: "northstar-studio/harbor-notes", daysStale: 19 },
      { repo: "northstar-studio/copperline", daysStale: 16 },
    ],
    failingCi: ["northstar-studio/field-kit"],
    openPullRequests: [{ repo: "northstar-studio/harbor-notes", count: 1 }],
    calendarEvents: [
      {
        title: "Atlas reviewer handoff",
        start: "2026-07-17T10:30:00Z",
        end: "2026-07-17T11:00:00Z",
        location: "Video call",
        allDay: false,
      },
      {
        title: "Community meetup logistics",
        start: "2026-07-17T15:00:00Z",
        end: "2026-07-17T15:30:00Z",
        allDay: false,
      },
    ],
    emailHighlights: [
      {
        subject: "Review notes for the Atlas walkthrough",
        from: "Mina Owusu <mina@example.org>",
        snippet: "Two small gaps remain in the setup sequence before tomorrow's handoff.",
        date: "2026-07-17T05:42:00Z",
        threadId: "demo-thread-01",
      },
      {
        subject: "Venue hold expires at noon",
        from: "Kojo Mensah <kojo@example.org>",
        snippet: "Please confirm the final attendee estimate so the room can be held.",
        date: "2026-07-17T05:18:00Z",
        threadId: "demo-thread-02",
      },
    ],
  },
};

export const demoReports = [
  {
    date: demoReport.date,
    lastModified: demoReport.generatedAt,
    size: new TextEncoder().encode(markdown).length,
  },
];

export const demoStatus = {
  lastRun: {
    date: demoReport.date,
    completedAt: demoReport.generatedAt,
  },
  nextRun: "2026-07-18T06:00:00.000Z",
  schedule: { cron: "0 6 * * ? *", timezone: "Africa/Accra" },
};
