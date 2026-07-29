# Blog System - Environment Setup

Create a `.env.local` file in the project root with the following variables:

```env
# Firebase Configuration
# Go to https://console.firebase.google.com/ → Create Project → Project Settings → Web App
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Cloudinary (for image/video uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset

# Session Secret (any random string for signing tokens)
SESSION_SECRET=any_random_long_string_here_at_least_32_chars

# Resend (sends the OTP code by email after password is correct)
# Get an API key at https://resend.com
RESEND_API_KEY=your_resend_api_key
ADMIN_EMAIL=the_email_address_that_should_receive_otp_codes
# Optional — only needed once you've verified a custom domain in Resend.
# Without it, mail is sent from onboarding@resend.dev (works, but only
# deliverable to the email tied to your Resend account).
RESEND_FROM_EMAIL="Portfolio Admin <onboarding@resend.dev>"

# YouTube (optional, for embedded unlisted videos in blog posts)
# See YOUTUBE_SETUP.md for how to obtain these
YOUTUBE_CLIENT_ID=your_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_oauth_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
```

## Admin Login Setup

Login is now two-step: password, then a 6-digit code emailed to `ADMIN_EMAIL`
(via Resend). The code expires in 5 minutes and locks out after 5 wrong
attempts.

The password itself is **not** an env var — it's a bcrypt hash stored in
Firestore (`admin_config/main`), so you can rotate it anytime without
redeploying. Set or change it with:

```bash
node --env-file=.env.local scripts/set-admin-password.mjs "your-new-password"
```

This requires the `NEXT_PUBLIC_FIREBASE_*` vars in `.env.local` (already
there) to reach your Firestore project — run it locally, or against
production Firestore, whenever you want to change the password. No
redeploy needed.

**Security note:** Firestore rules in this project are currently open
(`allow read, write: if true`, same as the `blogs` collection). That means
the bcrypt hash in `admin_config/main` could, in theory, be read by anyone
who has your public Firebase config and attempts an offline crack. Since
login also requires the emailed OTP, a cracked password alone isn't enough
to get in — but pick a genuinely strong, non-dictionary password, and
consider tightening Firestore rules (or moving to the Firebase Admin SDK)
later for defense in depth.

## Firebase Setup Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Go to Project Settings → Add a Web App → Copy config values
4. Enable **Firestore Database** (start in test mode)

## Cloudinary Setup (for images/videos):
1. Go to [Cloudinary](https://cloudinary.com/) and sign up (free)
2. From the Dashboard, copy your **Cloud Name**
3. Go to Settings → Upload → Scroll to "Upload presets"
4. Click "Add upload preset" → Set signing mode to **Unsigned** → Save
5. Copy the preset name → Add both values to `.env.local`

## Firestore Security Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
**Note:** This is open because the API routes already check admin authentication. For extra security later, you can switch to Firebase Admin SDK which bypasses rules.

