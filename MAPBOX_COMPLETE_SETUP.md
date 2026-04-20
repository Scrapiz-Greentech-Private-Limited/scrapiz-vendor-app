# Mapbox Complete Setup Guide

## The Problem

Getting error: `MapboxConfigurationException: Using MapboxOptions requires providing a valid access token`

## Quick Fix (3 Steps)

### 1. Get Mapbox Secret Token

- Go to https://account.mapbox.com/access-tokens/
- Create **Secret Token** with **DOWNLOADS:READ** scope
- Copy token (starts with `sk.`)

### 2. Add to .env.local

```env
MAPBOX_DOWNLOADS_TOKEN=<MAPBOX_DOWNLOADS_TOKEN>
```

### 3. Add to android/gradle.properties

```properties
MAPBOX_DOWNLOADS_TOKEN=<MAPBOX_DOWNLOADS_TOKEN>
```

### 4. Set EAS Secret (for cloud builds)

For `eas build`, local `.env.local` and local `android/gradle.properties` are not sufficient.
Set one of these project secrets in EAS:

- `MAPBOX_DOWNLOADS_TOKEN`
- `ORG_GRADLE_PROJECT_MAPBOX_DOWNLOADS_TOKEN`
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`

Example:

```bash
eas secret:create --scope project --name ORG_GRADLE_PROJECT_MAPBOX_DOWNLOADS_TOKEN --value <MAPBOX_DOWNLOADS_TOKEN>
```

### 5. Rebuild

```bash
npx expo prebuild --clean
npx expo run:android
```

## What Was Fixed

✅ Created `plugins/withMapboxAccessToken.js` - Adds token to AndroidManifest
✅ Updated `app.config.js` - Configured Mapbox plugins
✅ Updated `android/build.gradle` - Added Mapbox Maven repo
✅ Updated `.env.local` - Added token placeholders

## Two Tokens Needed

| Token  | Starts With | Purpose         | Add To                                                                   |
| ------ | ----------- | --------------- | ------------------------------------------------------------------------ |
| Public | `pk.`       | Runtime maps    | `.env.local` as `EXPO_PUBLIC_MAPBOX_API_KEY`                             |
| Secret | `sk.`       | Build downloads | `.env.local` and `android/gradle.properties` as `MAPBOX_DOWNLOADS_TOKEN` |

Your public token should be configured via `.env.local` as `EXPO_PUBLIC_MAPBOX_API_KEY`.

You just need to add the secret token!

## Troubleshooting

**Build fails with "401 Unauthorized" from api.mapbox.com**
→ Secret token is missing/invalid in EAS or missing `DOWNLOADS:READ` scope.

**Build fails with "Could not find com.mapbox.maps"**
→ Add secret token to `android/gradle.properties` for local builds and set EAS secret for cloud builds.

**Runtime error "MapboxConfigurationException"**
→ Run `npx expo prebuild --clean` to regenerate AndroidManifest

**Token not being read**
→ Make sure `.env.local` has `EXPO_PUBLIC_MAPBOX_API_KEY` and `MAPBOX_DOWNLOADS_TOKEN`

## Files Changed

- ✅ `plugins/withMapboxAccessToken.js` (created)
- ✅ `app.config.js` (updated)
- ✅ `android/build.gradle` (updated)
- ✅ `android/gradle.properties` (updated)
- ✅ `.env.local` (updated)

Everything is configured! Just add your secret token and rebuild.
