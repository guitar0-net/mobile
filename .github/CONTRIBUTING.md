<!--
SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Contributing to guitar0.net/mobile

Expo + React Native app for a guitar education platform. TypeScript, npm, Jest.

## Getting Started

```bash
cp .env.example .env.local
make install
make ios        # or: make android
```

The app needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/); Expo Go is not supported. Install packages with `npx expo install <package>`, not with a plain `npm install`, so versions match the Expo SDK.

Before opening a PR, make sure all checks pass:

```bash
make ci
```

## Branching

Branch names determine the PR label, which determines the release category. Use these prefixes:

| Prefix                             | Label          |
| ---------------------------------- | -------------- |
| `feat/`                            | feature        |
| `fix/`, `hotfix/`                  | bug            |
| `security/`                        | security       |
| `infra/`, `ci/`, `eas/`, `native/` | infrastructure |
| `chore/`, `refactor/`, `docs/`     | chore          |

Example: `feat/chord-diagram`, `fix/tuner-permission`.

## Commits

The project uses [Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint in a `commit-msg` hook:

```
type(scope): subject
```

- One line, English, imperative mood, lowercase, no trailing period.
- The scope is the module folder: a folder under `src/features/` or `src/lib/`, `ui` for `src/components/ui/`, `router` for `src/app/`, `ci` for workflows and configs.
- One logical change per commit.

```
feat(tuner): add drop d preset
fix(lessons): keep scroll position after returning from a song
```

## Issues

Before starting significant work, open an issue to discuss the approach. For small bug fixes or typos a PR without an issue is fine.

## Pull Requests

- One concern per PR
- **Edit the PR title before merging** — it appears verbatim in the GitHub Release changelog
- We use **Squash and Merge** — the PR title becomes the single commit message on `main`

## Architecture

- `src/app/` holds routes only; screens import from `features/` and `lib/` and contain no business logic.
- `src/features/<domain>/` is a domain module. Other modules use it only through its `index.ts`.
- `src/lib/` is infrastructure without a business domain (db, network, sync, themes).
- The app is offline-first: never gate UI on network availability.
- Use the components from `src/components/ui/`, icons from `expo-symbols`, theme colors from `useColors()`.

## Code Style

```bash
make lint
make format
make typecheck
```

Every source file must have an SPDX license header. If you're creating a new file, use your own name and the current year:

```ts
// SPDX-FileCopyrightText: <year> <Your Name> <your@email.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later
```

If you're modifying an existing file, add your line below the existing one:

```ts
// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
// SPDX-FileCopyrightText: <year> <Your Name> <your@email.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later
```

The `pre-commit` hook runs `reuse lint` and rejects files without a header.

## Testing

```bash
make test
npm run test:coverage
```

Coverage threshold: **80%** for statements, branches and lines. Test behavior at a module's public interface: what the user sees or what a caller gets. A test that only checks that a component renders is not accepted; exclude a file with no testable behavior from coverage in `jest.config.js` instead.

## License of Contributions

The app is distributed through the Apple App Store and Google Play. By submitting a contribution, you agree that it is licensed under the [GNU AGPL v3.0 or later](../LICENSES/AGPL-3.0-or-later.txt) together with the [app store exception](../README.md#app-store-exception), which permits distribution through those stores.

Do not add dependencies licensed under GPL or AGPL only: the app store exception covers code of this project, not third-party code.
