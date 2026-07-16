const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EXPIRY_SKEW_MS = 60_000;

let cachedToken = null;
let tokenPromise = null;

export function hasGoogleOauth(oauth) {
  return Boolean(
    oauth?.clientId && oauth?.clientSecret && oauth?.refreshToken
  );
}

async function refreshAccessToken(oauth, fetchImpl) {
  const body = new URLSearchParams({
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    refresh_token: oauth.refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google OAuth refresh failed (${response.status})`);
  }
  const token = await response.json();
  if (!token.access_token) throw new Error("Google OAuth returned no access token");
  return {
    value: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
}

export async function getGoogleAccessToken(oauth, fetchImpl = fetch) {
  if (!hasGoogleOauth(oauth)) return null;

  // Test-injected fetch functions remain isolated. Lambda calls use the global
  // fetch and share one refresh across parallel Calendar/Gmail requests.
  if (fetchImpl !== globalThis.fetch) {
    return (await refreshAccessToken(oauth, fetchImpl)).value;
  }
  if (cachedToken?.expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    return cachedToken.value;
  }
  tokenPromise ??= refreshAccessToken(oauth, fetchImpl);
  try {
    cachedToken = await tokenPromise;
    return cachedToken.value;
  } finally {
    tokenPromise = null;
  }
}

export async function fetchGoogleJson(url, { oauth, fetchImpl = fetch }) {
  const accessToken = await getGoogleAccessToken(oauth, fetchImpl);
  if (!accessToken) return null;
  const response = await fetchImpl(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google API request failed (${response.status})`);
  }
  return response.json();
}
