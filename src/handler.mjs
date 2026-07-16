// Orchestrator: gather → reason → deliver → archive.
// Triggered by EventBridge Scheduler (later) or manual invoke.
import { getConfig } from "./config.mjs";
import { getActiveTasks } from "./sources/tasks.mjs";
import { getGithubActivity } from "./sources/github.mjs";
import { getCalendarEvents } from "./sources/calendar.mjs";
import { getEmailHighlights } from "./sources/gmail.mjs";
import { getPriorityBriefing } from "./reasoning/briefing.mjs";
import { sendBriefing } from "./delivery/email.mjs";
import { archiveReport, getPreviousBriefing } from "./delivery/archive.mjs";

const TIMEZONE = "Africa/Accra";

function todayInAccra() {
  const now = new Date();
  const date = now.toLocaleDateString("en-CA", { timeZone: TIMEZONE }); // YYYY-MM-DD
  const dayOfWeek = now.toLocaleDateString("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
  });
  return { date, dayOfWeek };
}

export async function handler(event) {
  console.log("Orbit run started", JSON.stringify(event ?? {}));
  const config = await getConfig();
  const { date, dayOfWeek } = todayInAccra();

  // Gather — independent sources in parallel. GitHub failures shouldn't kill
  // the run; tasks are the one source we treat as required.
  const [tasks, github, calendar, gmail, previousBriefing] = await Promise.all(
    [
      getActiveTasks({ tableName: config.tasksTable }),
      getGithubActivity({
        token: config.githubToken,
        repos: config.githubRepos,
      }).catch((err) => {
        console.error("GitHub source failed, continuing without it:", err);
        return null;
      }),
      getCalendarEvents({ oauth: config.googleOauth }),
      getEmailHighlights({ oauth: config.googleOauth }),
      getPreviousBriefing({ bucket: config.reportsBucket, date }).catch(
        (err) => {
          console.error("Previous-briefing read failed, continuing:", err);
          return null;
        }
      ),
    ]
  );

  const context = {
    today: { date, dayOfWeek, timezone: TIMEZONE },
    tasks,
    github,
    calendar,
    gmail,
    previousBriefing,
  };
  console.log(
    `Gathered context: ${tasks.length} tasks, github=${
      github ? github.length + " repos" : "off"
    }, calendar=${calendar ? calendar.length + " events" : "off"}, gmail=${
      gmail ? gmail.length + " messages" : "off"
    }, previousBriefing=${previousBriefing ? previousBriefing.date : "none"}`
  );

  // Reason
  const briefing = await getPriorityBriefing(context, {
    apiKey: config.openaiApiKey,
  });

  // Archive first so the report survives even if SES fails.
  const reportKey = await archiveReport({
    bucket: config.reportsBucket,
    date,
    briefing,
    context,
  });
  console.log(`Report archived: s3://${config.reportsBucket}/${reportKey}`);

  // Deliver
  let messageId = null;
  if (config.briefingEmail) {
    messageId = await sendBriefing({
      to: config.briefingEmail,
      from: config.briefingEmail, // SES sandbox: same verified identity
      subject: `Orbit Briefing — ${dayOfWeek}, ${date}`,
      markdown: briefing,
    });
    console.log(`Briefing emailed, SES message id: ${messageId}`);
  } else {
    console.warn(
      "No briefing email configured (/orbit/briefing-email) — skipped SES send."
    );
  }

  return {
    statusCode: 200,
    date,
    reportKey,
    emailed: Boolean(messageId),
    messageId,
  };
}
