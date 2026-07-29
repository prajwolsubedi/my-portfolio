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

# Admin Password (plain text - will be compared directly)
ADMIN_PASSWORD=your_secure_admin_password_here

# Session Secret (any random string for signing tokens)
SESSION_SECRET=any_random_long_string_here_at_least_32_chars
```

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

