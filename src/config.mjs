// Central config: env vars first (local scripts with .env), then SSM Parameter
// Store (Lambda). Resolved once and cached for the lifetime of the runtime,
// so SSM is only hit at cold start.
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const PARAM_PREFIX = "/orbit";

let cachedConfig = null;
let ssmClient = null;

async function readParam(name, { decrypt }) {
  ssmClient ??= new SSMClient({});
  try {
    const out = await ssmClient.send(
      new GetParameterCommand({
        Name: `${PARAM_PREFIX}/${name}`,
        WithDecryption: decrypt,
      })
    );
    return out.Parameter?.Value ?? null;
  } catch (err) {
    if (err.name === "ParameterNotFound") return null;
    throw err;
  }
}

async function resolve(envKey, paramName, { decrypt = false } = {}) {
  if (process.env[envKey]) return process.env[envKey];
  return readParam(paramName, { decrypt });
}

export async function getConfig() {
  if (cachedConfig) return cachedConfig;

  const [openaiApiKey, githubToken, githubRepos, githubUser, briefingEmail] =
    await Promise.all([
      resolve("OPENAI_API_KEY", "openai-api-key", { decrypt: true }),
      resolve("GITHUB_TOKEN", "github-token", { decrypt: true }),
      // Optional override — when empty, github.mjs discovers owned repos via the PAT.
      resolve("GITHUB_REPOS", "github-repos"),
      // Optional; usually unnecessary — GET /user/repos uses the token's identity.
      resolve("GITHUB_USER", "github-user"),
      resolve("BRIEFING_EMAIL", "briefing-email"),
    ]);

  cachedConfig = {
    openaiApiKey,
    githubToken,
    githubRepos: (githubRepos ?? "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean),
    githubUser: githubUser || null,
    briefingEmail,
    tasksTable: process.env.TASKS_TABLE ?? "orbit-tasks",
    reportsBucket: process.env.REPORTS_BUCKET ?? null,
  };
  return cachedConfig;
}
