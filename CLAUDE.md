<!--
SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Project Guidelines

## Expo SDK 55 — Always read versioned docs first

Before writing any Expo or React Native code, consult the exact versioned docs:
**https://docs.expo.dev/versions/v55.0.0/**

---

## Expo SDK 55: Key Facts

### Runtime Requirements

- React Native 0.83, React 19.2.0, React Native Web 0.21.0
- Node.js: `^20.19.4`, `^22.13.0`, `^24.3.0`, or `^25.0.0` (LTS only)
- Android 7+, `compileSdkVersion 36`
- iOS 15.1+, Xcode 26.2+
- All SDK packages now version-aligned: `expo-camera@^55.0.0`, etc.

### Architecture

- **New Architecture only** — Legacy Architecture (Bridge) removed in SDK 55. Do not use any Bridge-era APIs.
- **Hermes v1** available via `useHermesV1` config flag; ~75% reduction in bytecode download times.
- **Swift 6 language mode** enforced in Expo Modules Core — data race safety at compile time.
- **New project template**: source code lives in `/src/app`, not `/app`. Follow this convention.
- Dynamic app config supports `.mjs`, `.cjs`, `.cts`, `.mts` extensions in addition to `.ts`.

### Breaking Changes to Know

| Old                                                             | New / Action                                          |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| `notification` field in `app.json`                              | Throws error — use `expo-notifications` config plugin |
| Push notifications in Expo Go (Android)                         | Now errors (not warning) — use dev builds             |
| `expo-av` in Expo Go                                            | Removed — use `expo-video` + `expo-audio`             |
| `edgeToEdgeEnabled` config option                               | Removed — edge-to-edge is mandatory on Android 16+    |
| Most `expo-navigation-bar` / `expo-status-bar` methods          | No-ops due to edge-to-edge — audit all usages         |
| `eas update` without `--environment`                            | Now required in all contexts                          |
| `app.json.ts` used Expo's bundled TS                            | Now uses your local TypeScript install                |
| `removeSubscription(sub)` pattern                               | Use `subscription.remove()` instead                   |
| `expo-video-thumbnails` package                                 | Use `generateThumbnailsAsync` from `expo-video`       |
| Expo UI: `DateTimePicker`                                       | Renamed to `DatePicker`                               |
| Expo UI: `Switch`                                               | Renamed to `Toggle`                                   |
| `expo-contacts`, `expo-media-library`, `expo-calendar` old APIs | Migrate to new object-oriented `next` APIs            |

### Key New Features

- **Native Tabs API**: platform-native tab experiences with responsive web layouts
- **Expo UI**: SwiftUI APIs redesigned to match Apple conventions; Jetpack Compose promoted to beta
- **expo-brownfield**: supports integrated and isolated brownfield approaches
- **expo-widgets (alpha)**: iOS home screen widgets using Expo UI components
- **expo-sqlite**: real-time SQLite Inspector DevTools Plugin; tagged template literals for type-safe queries
- **expo-audio**: lock-screen controls, background recording, playlist support across all platforms
- **expo-camera**: video stabilization, screen flash for front camera, barcode scanner opt-out
- **Expo Router expansions**: Colors API, zoom transitions, toolbar support, SplitView, form sheet footers

### Package Installation

Always use `npx expo install <package>` — never `npm install` or `yarn add` directly for Expo SDK packages. This ensures version compatibility. Fix mismatches with `npx expo install --fix`.

### Development Builds vs Expo Go

Use **development builds** (not Expo Go) for any app that:

- Uses libraries with native code
- Requires push notification testing (own certificates)
- Implements App Links or Universal Links
- Needs to test app icons, splash screens, or native config
- Targets an older SDK version on a physical device

### Expo Router (File-Based Routing)

- Routes are derived from the file structure in `/src/app/` — every file becomes a route automatically
- Every screen is deep-linkable by default; no manual deep link config needed
- Use **typed routes** to prevent linking to non-existent paths
- Use async routes (bundle splitting) to isolate errors and improve dev speed
- Upgrade one SDK version at a time to isolate breaking changes

---

## UI Components: prefer `src/components/ui`

Always use the project's UI components from `src/components/ui` before reaching for raw React Native primitives. For example:

- `Button` instead of `Pressable` + `Text`
- `Text` instead of RN `Text`
- `StatusMessage` for inline status/feedback

If a component exists in `src/components/ui` that covers the use case, use it. Only use raw primitives when there is no matching component.

---

## Icons: use `expo-symbols` everywhere

**Do not use `@expo/vector-icons`** — it is not installed. All icons (tab bar, buttons, badges, etc.) use `expo-symbols` via `SymbolView`.

```tsx
import { SymbolView } from "expo-symbols";

// Always pass both platforms:
<SymbolView
  name={{ ios: "play.fill", android: "play_arrow" }}
  size={24}
  tintColor="#FFFFFF"
/>;
```

- **iOS names** — SF Symbols. Browse in the [SF Symbols app](https://developer.apple.com/sf-symbols/) (macOS). Format: `"music.note.list"`, `"gear"`, `"play.fill"`.
- **Android names** — Material Symbols. Browse at [fonts.google.com/icons](https://fonts.google.com/icons). Format: `"play_arrow"`, `"settings"`, `"home"`.
- `tintColor` takes a real hex/rgba value — CSS variables (`var(--color-*)`) don't work here. Use `useColors()` (see below) to resolve theme tokens.

---

## Theme Colors: use `useColors()`

For any component that needs dynamic theme colors — `tintColor` on `SymbolView`, inline `style`, or any value that can't be expressed as a Tailwind class — use `useColors()` from `@/lib/themes`:

```tsx
import { useColors } from "@/lib/themes";

function MyComponent() {
  const colors = useColors();
  // colors.success, colors.primary, colors.mutedFg, colors.primaryFg, …
}
```

Never access `THEME_DEFINITIONS[theme]` directly inside components. Raw `THEME_DEFINITIONS` is only for infrastructure code that lives outside React (e.g. `ThemeProvider` itself).

---

## Component Organization

Components live in two tiers:

- `src/components/ui/` — generic, domain-agnostic primitives (Button, Text, Badge). Could exist in any project.
- `src/features/<domain>/components/` — domain-specific components. May reference domain types and concepts.

**Separate file** (`features/<domain>/components/MyComponent.tsx`) when the component:

- Represents a self-contained visual concept with its own logic or styling
- Is or could be reused elsewhere in the same feature

**Private component** (bottom of the same file) only for layout helpers with no logic — a 5-line `<Row>` wrapper that exists purely to reduce nesting.

This two-tier rule is independent of the "deep modules" principle. Splitting a self-contained component into its own file is not creating a shallow module — it is co-location of domain code. Shallow module means a bad abstraction with a trivial interface wrapping trivial implementation, not a file that happens to be small.

---

## Architecture Principles (Deep Modules)

Based on John Ousterhout's _A Philosophy of Software Design_:

### Deep over Shallow

A **deep module** has a small, simple interface hiding a large implementation. Prefer depth over breadth:

- A module with 2 entry points and 500 lines of internal logic is better than 10 tiny files that expose the same complexity
- The interface complexity should be much lower than the implementation complexity
- If removing a module's abstraction doesn't simplify callers, the abstraction isn't earning its keep

### Test at the Boundary

- Test modules at their **public interface**, not their internals
- Do not extract pure functions solely for testability when the real bugs live in how they're called
- Integration tests at module boundaries replace many shallow unit tests and catch more real bugs
- Mocking internals to make tests pass is a smell — redesign the interface instead

### Coverage Gate and How to Meet It

`jest.config.js` enforces `statements/branches/lines ≥ 80%`. This is a hard CI gate — PRs that don't pass it cannot be merged. The `functions` threshold is intentionally absent because JSX prop callbacks and `useMemo` lambdas distort that metric.

There are exactly two acceptable ways to satisfy the gate:

1. **Write a behavioral test** — one that asserts a specific outcome a real user or caller would observe.
2. **Exclude the file from coverage** — add it to `collectCoverageFrom` exclusions in `jest.config.js`.

**Smoke tests are not an acceptable third option.** `expect(toJSON()).toBeTruthy()` proves the component didn't throw during render — that is a very narrow class of bugs and almost never the one you're worried about.

**Litmus test before writing any test:** What specific regression would this catch? If you can't name one, either the test is wrong or the file should be excluded.

For UI components, a test earns its place by asserting one of:

- Specific text or element that appears under specific props
- That a user interaction (press, input) triggers the expected effect
- That conditional logic shows or hides the right elements

When a file genuinely has no testable behavior — a thin pass-through wrapper, a Drizzle schema definition, `__DEV__`-only utilities — add it to the exclusion list rather than inventing tests. This is already done for `lib/dev/**` and `features/lessons/schema.ts`.

### Coupling Signals Consolidation Opportunity

When two modules share types, co-own a concept, or always change together, they are candidates for merging into one deeper module. Ask:

- Does understanding concept X require bouncing between many small files?
- Is the interface nearly as complex as the implementation it wraps?
- Do tightly-coupled modules create integration risk at their seams?

### Avoid Shallow Modules

Red flags for shallow modules:

- A wrapper that adds no abstraction value (pass-through functions)
- Modules created purely to satisfy a naming convention without encapsulating real complexity
- Abstractions that require callers to understand the internals to use correctly

### AI Navigability

Write code so that an AI (or a new developer) can understand any module without reading all its dependencies. Each module should:

- Have a clear, stable interface that communicates intent
- Hide implementation details behind that interface
- Be understandable in isolation from its callers

---

## Directory Structure

```
src/
  app/           — Expo Router routes only; screens are thin, no business logic
  features/      — domain modules (lessons, settings, announcements, …)
    <domain>/
      components/  — domain-specific components, co-located with the feature
      index.ts     — public interface of the domain module
  lib/           — infrastructure with no business domain
    network/     — API client, fetcher, query-client
    sync/        — app-level sync orchestration
    themes/      — ThemeProvider, useColors, definitions
    dev/         — __DEV__-only utilities (excluded from prod bundles)
    utils.ts
  components/
    ui/          — generic, reusable primitives (Button, Text, Badge, …)
```

**Rule of thumb:**

- Add a new **business concept** (courses, users, practice sessions) → `features/<domain>/`
- Add something **infrastructure** that any domain could use (caching, HTTP, storage wrappers) → `lib/`
- Screens import from `features/` and `lib/`; `features/` modules may import from `lib/` but never from each other's internals — only through each other's public `index.ts`

---

## App Architecture

### Offline-First

This is an **offline-first** app. All lesson content (courses, lessons, songs, chords, schemes) lives in local SQLite and is fully usable without a network connection. Sync with the server is a background operation that keeps local data fresh — it is never a prerequisite for using the app (except on the very first launch when SQLite is empty).

- After the first sync completes, the app must work entirely from local SQLite.
- Network errors on subsequent syncs are silently ignored — the user continues with cached data.
- Never gate UI on network availability after initial sync is done (`isInitialSyncDone === true`).

### Dev Tooling (`src/lib/dev`)

`src/lib/dev` is a **`__DEV__`-only module**. Metro's dead-code elimination removes it entirely from production bundles — `if (__DEV__)` blocks compile away to nothing in release builds.

- Its only consumer is `src/app/(tabs)/dev.tsx` (the dev tab, also `__DEV__`-only via `{__DEV__ && ...}` in `app-tabs.tsx`).
- Never import from `src/lib/dev` in production code paths, even conditionally — keep all dev imports inside `__DEV__` guards or in the dev tab itself.
- Add new dev utilities as files inside `src/lib/dev/` and re-export from `index.ts`.
- `lib/dev` may import from `features/` — it needs domain internals for reset/inspection utilities.

---

## File Naming

- **Component files** → `kebab-case.tsx` (`button.tsx`, `lesson-list-item.tsx`)
- **Utility, hook, logic files** → `kebab-case.ts` (`use-colors.ts`, `utils.ts`, `logic.ts`)
- **Expo Router routes** → `kebab-case.tsx` or `[param].tsx` (required by Expo Router)

Never use `PascalCase` for file names — macOS is case-insensitive but Linux CI is not, which causes builds to silently break when import casing mismatches the actual filename.

---

## Code Style

### Comments

Write comments only when they add real value that the code itself cannot convey. Do not write comments that restate what the code already says. Good reasons to comment: non-obvious business rules, intentional workarounds, references to external specs. Bad reasons: explaining what a function does when its name already says it, noting that a file is a test utility (the filename does that).

Never use section-separator comments — banners like `// --- State shape ---` or `// =========` that divide a file into labeled regions. If a file needs visual navigation aids to be readable, it is a signal to split it into smaller modules, not to add decorative dividers.

### No Nested Ternaries

Never nest ternary operators. Any `? x : y` inside another `? x : y` must be extracted to a named variable before the JSX:

```tsx
// Bad
style={{ color: done ? colors.success : colors.mutedFg }}
// (acceptable — single level)

// Bad — nested
className={isContinue ? done ? "text-primary-fg" : "text-primary-fg opacity-70" : undefined}

// Good — extract to variable
const textClass = isContinue
  ? done ? "text-primary-fg" : "text-primary-fg opacity-70"
  : undefined;
// Still nested — go further:
let textClass: string | undefined;
if (isContinue) textClass = done ? "text-primary-fg" : "text-primary-fg opacity-70";
```

Exception: `cn()` with boolean `&&` conditions is not a ternary and is always preferred over ternaries for className composition.

---

## Commit Messages

Format: `type(scope): subject`

Enforced by commitlint + husky — commits that violate the format are rejected automatically.

### Rules

- **One line only** — no body, no footer, no co-authored-by.
- **English**, imperative mood: `add`, `fix`, `remove`, `update` — not `added` or `adds`.
- Subject is lowercase, no trailing period.
- **Each commit covers one logical change** — if files touch unrelated concerns, split them into separate commits.

### Scopes

Use one of the established scopes:

| Scope           | What it covers                         |
| --------------- | -------------------------------------- |
| `songs`         | `src/features/songs/`                  |
| `lessons`       | `src/features/lessons/`                |
| `settings`      | `src/features/settings/`               |
| `announcements` | `src/features/announcements/`          |
| `db`            | `src/lib/db/`                          |
| `network`       | `src/lib/network/`                     |
| `sync`          | `src/lib/sync/`                        |
| `themes`        | `src/lib/themes/`                      |
| `ui`            | `src/components/ui/`                   |
| `dev`           | `src/lib/dev/`                         |
| `router`        | `src/app/` (routes and screens)        |
| `ci`            | GitHub Actions, EAS workflows, configs |
