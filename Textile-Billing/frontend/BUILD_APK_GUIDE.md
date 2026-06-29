# Building the TextilePro Android APK

Your app is now Capacitor-ready. The web part is done — you just need to build
the actual `.apk` on your Windows PC using Android Studio.

---

## What's already set up
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` installed
- `capacitor.config.json` — app ID `com.textilepro.billing`, name "TextilePro"
- `android/` folder — the native Android project
- App icons (indigo diamond) in all densities
- `.env.production` → points the app to `http://13.62.231.10/api`
- `AndroidManifest.xml` → cleartext HTTP allowed (needed because server is HTTP)

---

## One-time setup on your Windows PC

1. **Install Android Studio** — https://developer.android.com/studio
   (Big download ~1 GB. During setup it installs the Android SDK + Java automatically.)

2. **Install Node** — you already have it.

---

## Building the APK

### Step 1 — pull the latest code & install
In your project's `frontend` folder (Windows PowerShell):
```powershell
cd frontend
npm install
```

### Step 2 — build the web app + sync to Android
```powershell
npm run build:app
```
This runs `vite build` (creates `dist`) then `cap sync android` (copies it into the Android project).

### Step 3 — open in Android Studio
```powershell
npm run open:android
```
Android Studio opens the project. First time, it will download Gradle dependencies (wait a few minutes — bottom status bar shows progress).

### Step 4 — build the APK
In Android Studio's top menu:
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- Wait for "APK(s) generated successfully" notification
- Click **locate** in the popup — it opens the folder with `app-debug.apk`

The file is at:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 5 — install on your phone
- Copy `app-debug.apk` to your phone (USB, WhatsApp to yourself, Google Drive, etc.)
- On the phone, tap the file → "Install"
- You may need to allow "Install from unknown sources" the first time
- TextilePro icon appears in your app drawer

---

## Updating the app later
Whenever you change the code:
```powershell
cd frontend
npm run build:app
npm run open:android
```
Then Build → Build APK again, reinstall on phone.

(The app still talks to your live AWS backend, so backend changes don't need a new APK — only frontend changes do.)

---

## IMPORTANT — about HTTP vs HTTPS
Right now the app talks to `http://13.62.231.10` (plain HTTP). I've configured
Android to allow this (cleartext). It works, but:
- It's less secure (data isn't encrypted in transit)
- If you later add a domain + HTTPS, edit `.env.production`:
  ```
  VITE_API_URL=https://yourdomain.com/api
  ```
  then rebuild. You can also remove `android:usesCleartextTraffic="true"`
  from `AndroidManifest.xml` once on HTTPS.

---

## For the Google Play Store (optional, later)
The `app-debug.apk` is fine for installing on your own phones. For the Play Store
you need a **signed release APK/AAB**:
1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Create a keystore (keep it safe — you need it for every future update)
3. Choose "release" build
4. Upload the `.aab` to Play Console (one-time $25 developer fee)
