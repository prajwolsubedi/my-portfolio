#!/usr/bin/env node
// One-time helper to mint a YouTube Data API refresh token for uploading unlisted videos.
// Usage: node scripts/get-youtube-refresh-token.mjs
// See YOUTUBE_SETUP.md for how to create the OAuth client this script needs.

import http from "node:http";
import readline from "node:readline";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const clientId = process.env.YOUTUBE_CLIENT_ID || (await ask("YouTube OAuth Client ID: "));
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || (await ask("YouTube OAuth Client Secret: "));

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("\nOpen this URL in your browser and approve access with the YouTube account you want to upload to:\n");
  console.log(authUrl.toString());
  console.log(`\nWaiting for the redirect on ${REDIRECT_URI} ...\n`);

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const authCode = url.searchParams.get("code");
      const err = url.searchParams.get("error");
      res.end(
        authCode
          ? "Success! You can close this tab and return to the terminal."
          : `Authorization failed: ${err || "no code received"}. You can close this tab.`
      );
      server.close();
      if (authCode) resolve(authCode);
      else reject(new Error(err || "No authorization code received"));
    });
    server.listen(PORT);
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("Failed to exchange code for tokens:", data);
    process.exit(1);
  }

  if (!data.refresh_token) {
    console.error(
      "\nNo refresh_token was returned. This usually happens if you've already authorized this app before " +
        "(Google only issues a refresh token on the first consent).\n" +
        "Go to https://myaccount.google.com/permissions, remove access for this app, and run this script again.\n"
    );
    process.exit(1);
  }

  console.log("\nSuccess! Add these to your .env.local:\n");
  console.log(`YOUTUBE_CLIENT_ID=${clientId}`);
  console.log(`YOUTUBE_CLIENT_SECRET=${clientSecret}`);
  console.log(`YOUTUBE_REFRESH_TOKEN=${data.refresh_token}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
