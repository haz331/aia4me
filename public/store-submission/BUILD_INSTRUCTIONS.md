# AIA 4 Me — App Store Build Instructions

## Prerequisites
- Node.js 18+ installed
- For iOS: a Mac with Xcode installed + Apple Developer account ($99/yr)
- For Android: Android Studio installed + Google Play account ($25 one-time)
- For Windows: Windows 10/11 + Microsoft Partner Center account ($19 one-time)

---

## Step 1 — Project Setup

```bash
# Create a new Vite React project
npm create vite@latest aia4me -- --template react
cd aia4me

# Install Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npm install @capacitor/splash-screen @capacitor/status-bar

# Copy capacitor.config.json from store-submission/ to root
```

---

## Step 2 — Set the web URL

The app points to your live web app. In capacitor.config.json, the `server.url` is already set to your live AIA 4 Me URL. This means you don't need to rebuild for every update — the app always loads the latest version from the web.

---

## Step 3 — Build for Android (Google Play + Samsung + Amazon)

```bash
# Add Android platform
npx cap add android

# Sync
npx cap sync android

# Open in Android Studio
npx cap open android
```

**In Android Studio:**
1. Build → Generate Signed Bundle/APK
2. Choose "Android App Bundle" (for Google Play) or "APK" (for Samsung/Amazon)
3. Create a new keystore (save this file — you need it forever)
4. Build release version

**Icon files needed** (copy from /icons/ folder):
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` → use android-48.png
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` → use android-72.png
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` → use android-96.png
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` → use android-144.png
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` → use android-192.png

---

## Step 4 — Build for iOS (Apple App Store)

```bash
# Add iOS platform (Mac only)
npx cap add ios

# Sync
npx cap sync ios

# Open in Xcode
npx cap open ios
```

**In Xcode:**
1. Set Bundle Identifier to `com.aia4me.app`
2. Set your Apple Developer Team
3. Add icons to `Assets.xcassets/AppIcon.appiconset/` (use apple-*.png files)
4. Product → Archive → Distribute App → App Store Connect

---

## Step 5 — Build for Windows (Microsoft Store)

Use PWABuilder (free tool by Microsoft):

1. Go to **https://www.pwabuilder.com**
2. Enter your app URL: `https://jarvis-app-684735ec.base44.app`
3. Click "Package for stores"
4. Download the **Windows MSIX package**
5. Submit to Microsoft Partner Center

This is the easiest path for Windows — no code needed.

---

## Step 6 — Samsung Galaxy Store

Use the same AAB/APK from Step 3.
1. Go to **seller.samsungapps.com**
2. Create a new app
3. Upload your AAB file
4. Fill in store listing (see STORE_LISTINGS.md)

---

## Step 7 — Amazon Appstore

Use the APK from Step 3.
1. Go to **developer.amazon.com/apps-and-games**
2. Create a new app
3. Upload APK
4. Fill in store listing

---

## Store Listing Assets Needed

| Asset | Size | Notes |
|---|---|---|
| App Icon | 512x512 | Use icon-512.png |
| Feature Graphic (Android) | 1024x500 | Create a banner image |
| Screenshots | Min 2, portrait | Take from the app |
| Privacy Policy URL | — | Required by all stores |

---

## Privacy Policy (Required by all stores)

Since AIA 4 Me stores the API key locally on device and never sends it to any server except OpenAI directly, your privacy policy should state:
- No personal data is collected by the app developer
- The OpenAI API key is stored locally on the user's device
- Voice data is sent directly from the user's device to OpenAI for processing
- No analytics or tracking

You can generate a free privacy policy at: https://www.privacypolicygenerator.info
