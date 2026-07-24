# Lumida CLI

The official [Lumida](https://lumida.app) CLI lets you view a concise health
summary from your terminal.

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
lumida sleep --days 7
lumida logout
```

- `login` opens Lumida in your browser and waits for your authorization. Your
  password is never entered in the terminal, and the session is stored in the
  operating system's native credential store.
- `status` shows the account, CLI session expiration, and Google Health status.
- `summary` shows a compact health summary for the last 24 hours.
- `summary --date <YYYY-MM-DD>` shows the summary for one local calendar day.
- `sleep --days <number>` shows sleep history for 1 to 365 days. It defaults to
  7 days.
- `logout` revokes the server session before removing it locally.

Examples:

```bash
lumida sleep
lumida sleep --days 30
lumida sleep --days 365
lumida summary --date 2026-07-01
```
