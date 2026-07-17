// One-time local Google OAuth setup. Opens Google's consent screen, receives
// the loopback callback, and writes the credentials directly to SSM without
// printing the refresh token.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // Rely on the shell environment when .env is absent.
}

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const region = process.env.AWS_REGION || "us-east-1";
const parameterName = "/orbit/google-oauth";
const scopes = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

if (!clientId || !clientSecret) {
  console.error(
    "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env before running this script."
  );
  process.exit(1);
}

function openBrowser(url) {
  const command =
    process.platform === "win32"
      ? {
          executable: "powershell.exe",
          args: [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `Start-Process '${url.replaceAll("'", "''")}'`,
          ],
        }
      : process.platform === "darwin"
        ? { executable: "open", args: [url] }
        : { executable: "xdg-open", args: [url] };
  const child = spawn(command.executable, command.args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function waitForAuthorizationCode() {
  return new Promise((resolve, reject) => {
    const state = randomBytes(24).toString("hex");
    const server = createServer((request, response) => {
      const callback = new URL(request.url, "http://127.0.0.1");
      if (callback.pathname !== "/oauth2callback") {
        response.writeHead(404).end("Not found");
        return;
      }
      if (callback.searchParams.get("state") !== state) {
        response.writeHead(400).end("Invalid OAuth state");
        server.close();
        reject(new Error("Google OAuth state mismatch"));
        return;
      }
      const error = callback.searchParams.get("error");
      const code = callback.searchParams.get("code");
      if (error || !code) {
        response.writeHead(400).end("Authorization was not completed.");
        server.close();
        reject(new Error(`Google authorization failed: ${error || "no code"}`));
        return;
      }
      response
        .writeHead(200, { "content-type": "text/plain; charset=utf-8" })
        .end("Orbit is connected. You can close this tab.");
      server.close();
      resolve({ code, redirectUri });
    });

    let redirectUri;
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
      const authorizationUrl = new URL(
        "https://accounts.google.com/o/oauth2/v2/auth"
      );
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      });
      console.log("Opening Google consent in your browser...");
      openBrowser(authorizationUrl.toString());
      console.log(
        "\nIf your browser did not open, paste this URL into a browser signed in as anarbajoel@gmail.com:\n" +
          authorizationUrl.toString() +
          "\n"
      );
    });

    server.setTimeout(5 * 60_000, () => {
      server.close();
      reject(new Error("Timed out waiting for Google OAuth consent"));
    });
  });
}

async function exchangeCode({ code, redirectUri }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`);
  }
  const tokens = await response.json();
  if (!tokens.refresh_token) {
    throw new Error(
      "Google returned no refresh token. Revoke the app grant, then run setup again."
    );
  }
  return tokens.refresh_token;
}

try {
  const authorization = await waitForAuthorizationCode();
  const refreshToken = await exchangeCode(authorization);
  const ssm = new SSMClient({ region });
  await ssm.send(
    new PutParameterCommand({
      Name: parameterName,
      Type: "SecureString",
      Overwrite: true,
      Value: JSON.stringify({ clientId, clientSecret, refreshToken }),
    })
  );
  console.log(
    `Google OAuth connected and stored securely in ${parameterName} (${region}).`
  );
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
