# YouTube Video Upload Setup

This lets the blog editor's "+ YouTube" block upload a video directly to your YouTube
account as **unlisted** and embed it inline (no visible "go to YouTube" redirect).

## 1. Create a Google Cloud project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or reuse one).
2. In **APIs & Services → Library**, search for **YouTube Data API v3** and enable it.

## 2. Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External**, fill in the required app name/support email fields.
3. Add the scope `https://www.googleapis.com/auth/youtube.upload`.
4. Under **Test users**, add the Google account (your own) that owns the YouTube channel you'll upload to.
5. Leave the app in **Testing** status — do **not** submit for verification.

   **Why this matters:** an unverified app's refresh tokens normally expire after 7 days. That
   expiry does **not** apply to accounts listed as test users — their tokens are long-lived. If
   you skip adding yourself as a test user, uploads will silently start failing about a week
   after setup.

## 3. Create OAuth credentials

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Desktop app** (this allows the loopback redirect the setup script uses,
   without having to register an exact port).
3. Save the generated **Client ID** and **Client Secret**.

## 4. Mint a refresh token (one-time)

Run the included script locally (not on your server/host):

```bash
node scripts/get-youtube-refresh-token.mjs
```

It will ask for your Client ID/Secret (or read them from env vars if already set), print a
Google consent URL to open in your browser, and once you approve access, print the three
values to add to `.env.local`:

```env
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

Add the same three variables to your production host's environment (e.g. Vercel project
settings) when deploying.

## Limits and caveats

- **Quota**: the default YouTube Data API quota is 10,000 units/day, and a single upload
  costs 1,600 units — a ceiling of about 6 uploads/day. Fine for a personal blog; if you ever
  need more, request a quota increase in the Cloud Console (requires Google's app-verification
  review).
- **File size**: the upload route caps files at 100MB, matching the existing Cloudinary video
  limit in `/api/upload`.
- **Processing time**: YouTube needs some time after upload to finish processing a video before
  it's reliably playable. The embed will show YouTube's own "processing" state until then — no
  action needed, it resolves on its own.
- Videos are always uploaded with `privacyStatus: unlisted` — not searchable on YouTube, only
  viewable by anyone with the link (i.e. anyone who loads your blog post).
