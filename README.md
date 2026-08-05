# Lumida CLI

The official [Lumida](https://lumida.app) CLI reads your health data from the
terminal: summaries over a day or a period, sleep history with its trend, and
JSON output you can pipe into your own scripts.

## Demo

### Summary

![Lumida CLI displaying a health summary](https://raw.githubusercontent.com/generalentropy/lumida-cli/master/assets/summary.gif)

### Sleep history

![Lumida CLI displaying seven days of sleep history](https://raw.githubusercontent.com/generalentropy/lumida-cli/master/assets/sleep.gif)

## Requirements

- Node.js 22 or later
- a Lumida account connected to Google Health

## Installation

```bash
npm install --global lumida-cli
```

The installed command is `lumida`.

## Commands

```bash
lumida login
lumida status
lumida summary
lumida summary --date 2026-07-01
lumida summary --days 30
lumida sleep --days 7
lumida logout
```

- `login` opens Lumida in your browser and waits for your authorization. Your
  password is never entered in the terminal, and the session is stored in the
  operating system's native credential store.
- `status` shows the account, CLI session expiration, and Google Health status.
- `summary` shows a compact health summary for the last 24 hours.
- `summary --date <YYYY-MM-DD>` shows the summary for one local calendar day.
- `summary --days <number>` summarizes a rolling window of 1 to 90 days.
- `sleep --days <number>` shows sleep history for 1 to 365 days. It defaults to
  7 days.
- `logout` revokes the server session before removing it locally.

`--date` and `--days` describe the same thing and cannot be combined.

Examples:

```bash
lumida sleep
lumida sleep --days 30
lumida sleep --days 365
lumida summary --date 2026-07-01
lumida summary --days 7
```

### Why summaries stop at 90 days

Sleep history is a single list of sessions, so a full year is one request. A
summary instead aggregates rolled-up metrics that Google caps at 14 days per
heart-rate request, so a long period becomes a chain of upstream calls. The
90-day ceiling keeps a summary responsive. Use the web app for longer periods.

## JSON output

`status`, `summary` and `sleep` accept `--json` and print the raw response on
standard output:

```bash
lumida summary --json
lumida summary --days 30 --json
lumida sleep --days 90 --json
lumida status --json
```

The output is meant to be piped. Data goes to standard output, every diagnostic
goes to standard error, and the exit code is non-zero on failure, so a script
can tell "no data" from "not connected":

```bash
lumida summary --json | jq .steps

# Average night over the last month, in hours
lumida sleep --days 30 --json \
  | jq '[.sessions[] | select(.isNap | not) | .minutesAsleep] | add / length / 60'

# Status bar, silently ignoring a disconnected CLI
lumida summary --json 2>/dev/null | jq -r '"\(.steps) steps"' || true
```

`status --json` adds a `connected` boolean so a script can branch without
parsing a message:

```json
{
  "connected": true,
  "account": { "email": "you@example.com" },
  "session": { "expiresAt": "2026-08-12T09:30:00.000Z" },
  "googleHealth": { "connected": true, "accessStatus": "approved" }
}
```

With no stored session it prints `{ "connected": false }` and exits
successfully — not being connected is an answer, not a failure.

## Sleep trend

`sleep` renders a `Trend` column: one bar per night, scaled to the longest night
of the period, so two rows can be compared at a glance.

```
  Date          Type    Duration    Time                Trend
  Aug 4, 2026   Sleep   7 h 30 min  11:12 PM – 6:42 AM  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  Aug 3, 2026   Sleep   6 h 10 min  12:05 AM – 6:15 AM  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  Aug 2, 2026   Nap     0 h 45 min  2:30 PM – 3:15 PM   ▄▄▄
  Aug 1, 2026   Sleep   8 h 05 min  10:40 PM – 6:45 AM  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  Jul 31, 2026  Sleep   5 h 30 min  11:50 PM – 5:20 AM  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  Jul 30, 2026  Sleep   7 h 50 min  11:05 PM – 7:10 AM  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
```

Bars are capped at 20 characters so a long series never breaks the layout, and
a short night keeps a minimum length so it stays readable. A night without a
measured duration draws nothing at all, which reads as "not measured" rather
than as a zero.

## Privacy

The CLI is read-only. Its session can never modify your account, disconnect
Google Health, or reach administration features, and the server returns only
the aggregated values shown above — no workout identifiers, GPS traces, sleep
segments, or device identifiers.

Your session token is stored only in your operating system's credential vault
(Keychain, Credential Manager, or Secret Service). There is no plaintext
fallback file, and each server origin gets its own entry.
