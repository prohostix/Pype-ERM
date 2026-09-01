# In-App Update + Direct-Download Distribution System

## Purpose
This is a technical handoff document for implementing the same self-hosted app-update mechanism PypeCRM uses in a different app. It covers: how a new release is published, how the running app discovers and installs an update from inside itself, and how the public website offers the same APK as a manual download — all without the Play Store.

This is not a proposal — it's a description of a system that is live in production today across two apps (`Dad-mobile`, the main CRM, and `Dad-call-recorder`, a sideloaded companion app), sharing one backend contract.

## 1. Why this exists
Both PypeCRM Android apps are distributed outside Google Play (one by choice — `Dad-call-recorder` can never go through Play, see its own docs — and both, practically, to ship fast without a Play review cycle). Without Play, there's no built-in update mechanism, so this system replaces it with three cooperating pieces:

1. A tiny **backend manifest** — "what's the latest version, and where's the file" — for each app.
2. An **in-app update check + one-tap download-and-install flow**, so users don't have to know a download page exists.
3. A **public download page** on the marketing site, for first installs and as a fallback.

## 2. Architecture at a glance

```
 Developer machine                    Backend (pypecrm.com)                 Device running the app
 ─────────────────                    ──────────────────────                 ──────────────────────
 1. flutter build apk --release
 2. scp APK -> uploads/releases/  --->  uploads/releases/<file>.apk
 3. run publish script            --->  SystemSetting row:
                                          app_release_<platform> = {
                                            versionName, versionCode,
                                            releaseNotes, apkFileName,
                                            releasedAt
                                          }
                                                                        <---  GET /api/app-releases/latest?platform=X
                                                                              (app compares versionCode to its own)
                                                                        <---  GET /api/app-releases/download/:platform
                                                                              (streams the current APK, in-app OR browser)
```

One version manifest per "platform" (PypeCRM's two apps use the platform keys `mobile` and `helper`; a new app would pick its own key). The manifest is intentionally dumb — a JSON blob, not a release history — because only "what's current right now" needs to be queryable.

## 3. Backend contract

### 3.1 Storage
No dedicated table. One row per app in a generic key/value settings table (`SystemSetting { key, value, group }` in PypeCRM's case — any app with an equivalent settings table works), keyed `app_release_<platform>`, value JSON-stringified:

```ts
interface ReleaseManifest {
  versionName: string;   // e.g. "1.2.4" — human-readable, shown to the user
  versionCode: number;   // e.g. 8       — the number actually compared against
  releaseNotes: string;  // free text shown in the update dialog / download page
  apkFileName: string;   // e.g. "PypeCRM-v1.2.4-prod.apk" — file on disk, not a URL
  releasedAt: string;    // ISO timestamp, informational only
}
```

Rationale for two version fields: `versionCode` is what update logic actually compares (a plain integer, monotonically increasing, matches Android's own `versionCode`/`android:versionCode` concept 1:1). `versionName` is display-only and can be any string — comparing it directly would be fragile ("1.10.0" vs "1.9.0" as strings sorts wrong).

### 3.2 Two endpoints, both unauthenticated
Deliberately public — the update check has to work before login (or for a user who's logged out), and the download page has no auth wall either.

```
GET /api/app-releases/latest?platform=<key>
```
- 200 → the `ReleaseManifest` JSON.
- 404 → `{ message: "No release published yet for platform \"<key>\"" }` — a real, expected state (first-ever deploy of a new platform key), not an error to alarm on.

```
GET /api/app-releases/download/:platform
```
- Looks up the current manifest for that platform, resolves `apkFileName` against the on-disk releases folder, and streams it back with `Content-Type: application/vnd.android.package-archive` and a `Content-Disposition` filename.
- **This URL never changes.** It always serves whatever the manifest currently points at — so a link to it (in the app, on the download page, in a bookmark) survives every future release without editing.
- 404 the same way as `/latest` if nothing's published yet.

### 3.3 The publish script
A tiny standalone script (not an HTTP endpoint — run manually/from a deploy script), because publishing is a rare, deliberate, human-triggered action, not something any client should be able to trigger:

```
npx tsx src/scripts/publishRelease.ts <platform> <apkFileName> <versionName> <versionCode> <releaseNotes>
```

It does exactly one thing: upserts the `SystemSetting` row above. **It does not move the file itself** — copying the actual `.apk` into the server's releases folder is a separate step (see §6). This separation matters: it lets you stage the file first, confirm it uploaded correctly, and only then flip the manifest to point at it — so a slow/partial upload never gets published as "current" mid-transfer.

## 4. Mobile app: in-app update flow

Three independent pieces, cleanly layered (repository → derived state providers → UI), each with a single job:

### 4.1 Data layer — `AppReleaseRepository`
Two methods, mapping directly to the two backend endpoints:
- `getLatestRelease(platform)` → parses the manifest JSON into a typed model. **Returns `null` on a 404, not a thrown error** — a "nothing published yet" response is expected and must not look like a failure to callers.
- `downloadApk(platform, savePath, onProgress)` → streams the APK straight to a local file path (not opening a browser), reporting `(receivedBytes, totalBytes)` as it goes for a progress bar.

### 4.2 Derived state — small, single-purpose reactive providers
This is the part worth copying exactly — it's what makes the update prompt appear/disappear correctly with almost no bespoke logic:

1. **`latestMobileRelease`** — wraps the repository call. Swallows *every* failure (network error, malformed JSON, whatever) to `null` rather than rethrowing. An update check must never surface an error dialog or block any other part of the app — worst case, it just silently doesn't offer an update this session.
2. **`currentPackageInfo`** — the running build's own version, read from the OS's real package metadata (Android's `PackageInfo`/`versionCode`), **not** from the app's own build-config source file. These can drift (a CI pipeline overriding `--build-number` at build time vs. what's checked into source), so always read the installed build's actual metadata, not a source constant.
3. **`availableUpdate`** — the actual comparison: non-null only when `manifest.versionCode > currentBuildNumber`. This one function is the entire "is there an update" logic in the whole system — everything else just reacts to its result.
4. **`dismissedUpdateVersion`** — persisted locally (any simple key-value local storage). Remembers which `versionCode` the user last tapped "Later" on, so the popup doesn't nag on every single app launch — but it reappears the moment a version *newer than the dismissed one* gets published, so a user can't accidentally suppress all future prompts forever by dismissing once.
5. **`pendingUpdatePrompt`** — combines #3 and #4: an update exists AND it's not the one already dismissed. This is the one and only thing the UI actually watches.

### 4.3 UI — an invisible checker widget
A zero-pixel widget mounted once, as a sibling in the app's outermost persistent layer (in PypeCRM's case, inside the same `Stack` as the global notification overlay) — not inside any single screen, so the check runs exactly once per app session regardless of which tab/screen is showing. It watches `pendingUpdatePrompt`; the moment it goes non-null, it shows a simple two-button dialog: **"Later"** (marks it dismissed) and **"Update"** (navigates to a dedicated update screen — doesn't start the download from the dialog itself).

### 4.4 Download-and-install (Android only — this whole subsection has no iOS equivalent, sideloaded installs aren't possible there)
A dedicated download screen/flow, driven by one controller with four states: idle → downloading (with progress) → (permission-needed | install-launched) → error.

1. **Download** the APK via the repository straight into the app's own **cache directory** (not Downloads/external storage) — nothing here needs to survive outside this one install attempt.
2. **Check install permission**: Android 8+ (API 26+) gates "install from this app" per-app (`packageManager.canRequestPackageInstalls()`); below API 26 there's no such restriction. Android will not let an app grant this to itself — if not already granted, open the OS's own permission screen for it (`Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES` scoped to this app's package) and let the controller **retry the install after the user comes back**, rather than making them re-download the file.
3. **Hand off to the system installer** via a `FileProvider` content URI, not a raw `file://` path — Android's StrictMode has blocked exposing raw file paths across app boundaries since API 24, so this step is mandatory, not optional hardening. Concretely: declare a `<provider android:name="androidx.core.content.FileProvider">` in the manifest scoped to **only the cache directory** (least privilege — nothing else in app storage needs to be exposable this way), then in native code `FileProvider.getUriForFile(context, "$packageName.fileprovider", file)` and fire an `ACTION_VIEW` intent typed `application/vnd.android.package-archive` with `FLAG_GRANT_READ_URI_PERMISSION`.
4. This only **launches** Android's own install/update confirmation UI — there is no way to silently complete an install without MDM/enterprise provisioning. The user still taps through Android's own "Install" button. Design the UI copy around that expectation rather than promising a fully silent update.

The Dart↔native bridge for steps 2-4 is a single `MethodChannel` with exactly four methods (`canRequestInstalls`, `openInstallPermissionSettings`, `installApk`, plus whatever the native side needs) — small enough that a generic plugin package would be overkill; a hand-rolled channel is the right size here.

## 5. Web: public download page
A plain page on the marketing site (in PypeCRM's case `pypecrm.com/download`, built with React/TanStack but the pattern is framework-agnostic) that, per app/platform card:
1. Calls `GET /api/app-releases/latest?platform=X` on mount.
2. Shows a loading spinner, then either the version + release notes + a **Download APK** button linking straight to `GET /api/app-releases/download/X` (a plain `<a href>`, not a fetch — let the browser handle the binary/Content-Disposition), or a friendly "No release published yet" state if the manifest 404s.

This page exists for two reasons: first-time installs (nobody has the app yet to check for updates from inside itself), and as a manual fallback if the in-app flow ever fails for a given user (permission denial they don't retry, an OS quirk, etc.).

## 6. Publishing a new release — the full manual workflow
This is the actual sequence a developer runs for every release (see PypeCRM's own `publish_release.sh` for a scripted version of steps 2-3):

1. **Bump the version** in the app's own build config (`versionName`/`versionCode` — Flutter: the `pubspec.yaml` `version: X.Y.Z+buildNumber` line; native Android: `versionName`/`versionCode` in `build.gradle`).
2. **Build the release artifact** (`flutter build apk --release` or the native-equivalent signed release build).
3. **Upload the APK file itself** to the server's releases folder (plain `scp`/`rsync` — no special upload endpoint, since this is a rare, human-run action, not something to expose over HTTP).
4. **Run the publish script** (`publishRelease.ts` above) with the exact `versionName`/`versionCode` from step 1 and the exact filename from step 3, plus a short release-notes string. This is the moment the new version actually goes live to every device that checks — steps 1-3 alone change nothing user-facing.
5. **Verify**: hit `GET /api/app-releases/latest?platform=X` and confirm the JSON matches, then load the public download page and confirm it reflects the new version too.

## 7. What to reuse vs. adapt for a different app
- **Directly reusable as-is**: the manifest shape (§3.1), the two-endpoint contract (§3.2), the publish script (§3.3), the derived-provider chain's *shape* (§4.2) — swap in whatever local state-management framework the other app uses, but keep the same five-step decomposition (raw fetch → own-version read → comparison → dismissal memory → final "should I nag" boolean). That decomposition is what makes the dialog logic trivial and easy to reason about; collapsing it into one big function is the tempting shortcut that makes it much harder to get the "don't nag after dismiss, but do re-nag on a newer version" behavior right.
- **Needs platform-specific reimplementation**: all of §4.4 (FileProvider/install-permission dance) is Android-API-specific — an iOS app can't sideload-install itself at all (App Store review would reject any such capability, and iOS has no equivalent OS-level install intent), so a similar app on iOS should skip §4.4 entirely and route straight to "open App Store" or, for an enterprise/ad-hoc-signed app, an MDM-driven update instead.
- **Needs a decision, not just a port**: the `platform` key scheme (§3.1) only matters once you have more than one distributable app sharing one backend, as PypeCRM does (`mobile` + `helper`). A single-app project can drop the query param entirely and use one manifest key.

## 8. Key source files (PypeCRM's implementation, for direct reference)
- Backend: `Dad-backend/src/controllers/appReleaseController.ts`, `Dad-backend/src/routes/appReleaseRoutes.ts`, `Dad-backend/src/scripts/publishRelease.ts`.
- Mobile (Flutter): `Dad-mobile/lib/features/app_updates/` — `domain/app_release.dart`, `data/app_release_repository.dart`, `providers/app_update_provider.dart`, `providers/apk_download_controller.dart`, `providers/apk_download_state.dart`, `data/apk_installer.dart`, `presentation/widgets/update_checker.dart`, `presentation/screens/updates_screen.dart`.
- Mobile (native Android glue): `Dad-mobile/android/app/src/main/kotlin/com/pypecrm/dad_mobile/MainActivity.kt` (the install `MethodChannel` handler), `Dad-mobile/android/app/src/main/res/xml/file_paths.xml` (FileProvider's exposed-paths config, scoped to the cache dir only), `Dad-mobile/android/app/src/main/AndroidManifest.xml` (the `<provider>` declaration).
- Web: `Dad-frontend/src/pages/DownloadApp.tsx`, `Dad-frontend/src/services/appReleaseService.ts`.
- Ops: `pypecrm/publish_release.sh` (wraps steps 3-4 of §6 into one command with SSH upload + the publish script call).
