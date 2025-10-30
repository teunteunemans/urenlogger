# Our Hours Ouwe - Discord Hour Logger Bot

A Discord bot for logging work hours with Firebase integration and automated email reporting.

## Features

- ✅ User registration system with real names
- ✅ Log, edit, and delete work hours per day
- ✅ Monthly email reports with CC functionality
- ✅ Automated billing period management (21st to 21st)
- ✅ Firebase Firestore integration
- ✅ Gmail SMTP email notifications
- ✅ Docker containerization for easy deployment

## Prerequisites

- Docker and Docker Compose
- Discord Bot Token (from [Discord Developer Portal](https://discord.com/developers/applications))
- Firebase Project with Firestore enabled
- Gmail account with App Password

## Quick Start with Docker

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd our-hours-ouwe
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

- Get Discord tokens from [Discord Developer Portal](https://discord.com/developers/applications)
- Download your Firebase service account JSON and place it as `service-account.json`
- Set up Gmail App Password in your Google Account settings

### 3. Build and Deploy

#### Option A: Using the build script (recommended)

```bash
./build.sh
```

#### Option B: Manual build

```bash
# Build TypeScript
npm run build

# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f discord-bot
```

## Environment Variables

| Variable                         | Description                           | Required |
| -------------------------------- | ------------------------------------- | -------- |
| `DISCORD_TOKEN`                  | Your Discord bot token                | ✅       |
| `CLIENT_ID`                      | Discord application ID                | ✅       |
| `GUILD_ID`                       | Discord server ID                     | ✅       |
| `LOG_CHANNEL_ID`                 | Channel ID for bot logs               | ✅       |
| `DEBUG_KEY`                      | Key for debug commands                | ✅       |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON | ✅       |
| `SMTP_HOST`                      | SMTP server (smtp.gmail.com)          | ✅       |
| `SMTP_PORT`                      | SMTP port (587)                       | ✅       |
| `SMTP_USER`                      | Gmail address                         | ✅       |
| `SMTP_PASS`                      | Gmail App Password                    | ✅       |
| `YOUR_EMAIL_ADDRESS`             | Your email for notifications          | ✅       |
| `BOSS_EMAIL`                     | Email for monthly reports             | ✅       |

## Discord Commands

| Command                              | Description                      |
| ------------------------------------ | -------------------------------- |
| `/register <name>`                   | Register with your real name     |
| `/log <date> <hours> <description>`  | Log work hours                   |
| `/edit <date> <hours> <description>` | Edit existing hours              |
| `/delete <date>`                     | Delete hours for a specific date |
| `/myhours`                           | View your logged hours           |
| `/email set <address>`               | Set email for CC reports         |
| `/email remove`                      | Remove email from CC             |
| `/email show`                        | Show your registered email       |
| `/debug <test_type>`                 | Run debug tests (admin only)     |

## Development

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy Discord commands
npm run deploy

# Start the bot
npm start

# Development mode with auto-reload
npm run dev
```

### Docker Development

```bash

```

bash

# Build for development

docker-compose -f docker-compose.dev.yml up

# Or build manually

docker build -t our-hours-ouwe .
docker run -p 3000:3000 --env-file .env our-hours-ouwe

```

```

## Project Structure

```
├── src/
│   ├── commands/          # Discord slash commands
│   ├── utils/            # Firebase, email utilities
│   ├── events/           # Discord event handlers
│   ├── types.ts          # TypeScript interfaces
│   ├── index.ts          # Main bot file
│   └── deploy-commands.ts # Command deployment
├── Dockerfile            # Container definition
├── docker-compose.yml    # Container orchestration
├── .env.example          # Environment template
└── service-account.json  # Firebase credentials (not in git)
```

## Security Notes

- 🔒 Service account JSON is excluded from git
- 🔒 Environment variables contain sensitive data
- 🔒 Container runs as non-root user
- 🔒 Firebase credentials are mounted read-only

## Troubleshooting

### Bot not responding to commands

1. Check if commands are deployed: `npm run deploy`
2. Verify bot has proper permissions in Discord server
3. Check bot logs: `docker-compose logs discord-bot`

### Email not sending

1. Verify Gmail App Password is correct
2. Check SMTP settings in `.env`
3. Ensure "Less secure app access" is enabled or App Password is used

### Firebase connection issues

1. Verify `service-account.json` is present and valid
2. Check Firebase project settings
3. Ensure Firestore is enabled

## License

This project is private and proprietary.
