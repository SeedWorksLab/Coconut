# Android startup repair — 2026-11-22

## Observed failure

The published 1.3.1 APK repeatedly crashed shortly after launch on a POCO F3
(ARM64, Android 13), upgraded from 1.3.0. Its native crash stack showed
`SIGSEGV` / null-pointer dereference in Hermes while
`worklets::UnpackerLoader::installUnpacker` initialized Worklets.

The installed dependency tree had Worklets 0.12.2 and Reanimated 4.6.0.
Expo SDK 57.0.24 recommends Worklets 0.10.1 and Reanimated 4.5.1, and npm
reported the installed Worklets version as incompatible with Expo Modules Core.
The relevant native libraries were identical between the original 1.3.0 and
1.3.1 APKs, so this does not prove that 1.3.1 introduced a new native library;
its changed startup bundle could expose an existing compatibility problem.

## Repair

- Pin Worklets 0.10.1 and Reanimated 4.5.1 explicitly in `package.json` and
  `package-lock.json`, matching Expo's supported versions.
- Add `npm run check:native-deps`, regression coverage, and a release-build
  guard before Android prebuild.
- Recompile native libraries and the release JavaScript bundle together using
  JDK 21. The first Gradle clean encountered stale CMake/codegen references;
  generated app build/CMake caches were preserved outside the repository and
  regenerated, without deleting source or changing device storage.

## Verification

- `npm ls react-native-worklets react-native-reanimated --depth=2`: supported
  versions deduplicated throughout Expo/Router; no prior invalid-peer error.
- `npm run check:native-deps`, `npm run typecheck`, `npm run lint`: passed.
- `npm test -- --runInBand`: 73 suites / 702 tests passed.
- `npm run export:web`: passed.
- `./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
  --no-daemon --console=plain`, with JDK 21, `NODE_ENV=production` and hosted
  web disabled: passed, 571 actionable tasks. Dependency deprecation warnings
  remain.
- The diagnostic APK's signing certificate matches the original APK; the
  rebuilt ARM64 Worklets library differs from the crashing build.
- Installed with `adb install -r` on the connected POCO F3. No uninstall,
  storage clear, database reset, financial-data edits or version bump.
  The original installation timestamp remained unchanged.
- Two cold launches passed. The app remained running and its main activity
  remained in the foreground; current-process AndroidRuntime, ReactNativeJS,
  libc and ExpoModulesCore startup warning/error filters were empty.

This verifies that restoring the Expo-supported combination resolves the
observed startup crash on this phone. It does not establish the exact
upstream Hermes fault mechanism, or substitute for a full functional/sync test.
Private app storage was not extracted: the installed release is not debuggable.
No emulator runtime check was performed during this repair.

## Diagnostic APK

`build/diagnostics/coconut-1.3.1-arm64-startup-fix.apk`

- Version 1.3.1 / version code 22, unchanged for the in-place test.
- ARM64-only diagnostic build, not a newly published universal release.
- SHA-256: `86fa95c888a7db1d9e90f94f3ea3db3b77e0836b355c9b120826fea868c2eab2`

No commit, tag, release-asset replacement, publication or backend change was
performed. The normal release build retains its configured multi-ABI targets.
