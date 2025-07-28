# SolMeme Creator Telegram Notifications

This document provides instructions for setting up and using the **enhanced Telegram notification system** in SolMeme Creator, which includes:

1. **Token Creation Notifications** - Automatic alerts when new tokens are created
2. **🆕 Welcome Messages** - Greet new users joining the community group
3. **🆕 Daily Summaries** - Automated daily recaps of all tokens created

## 📢 Feature Overview

### 1. Token Creation Notifications
When a new token is successfully created on the platform, the system automatically sends formatted notifications to both your channel and group.

### 2. 🆕 Welcome Messages
When new users join your Telegram community group, they receive an automated welcome message with:
- Personal greeting using their first name
- Introduction to SolMemeCreator
- Link to your platform
- Invitation to ask for help

### 3. 🆕 Daily Summaries
Every day at 23:59 UTC (configurable), the system automatically:
- Compiles a list of all tokens created in the last 24 hours
- Formats a professional summary message
- Posts to your announcement channel
- Includes contract addresses and promotional website links

## 🔧 Setup Instructions

### Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a chat and send `/newbot`
3. Follow the prompts to name your bot
4. Once created, **save the API token** that looks like `123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ`

### Step 2: Add Bot to Channel and Group

#### For Your Announcement Channel:

1. Create a channel if you don't have one
2. Add your bot as an administrator
3. Give it permission to post messages
4. Get the channel ID by:
   - Posting any message in the channel
   - Forwarding that message to [@getidsbot](https://t.me/getidsbot)
   - Look for the `forwarded from chat` ID which will be something like `-1001234567890`

#### For Your Community Group:

1. Add your bot to your community group as an administrator
2. Give it permission to post messages
3. **🆕 IMPORTANT**: Disable privacy mode for the bot to see member joins:
   - Go back to @BotFather
   - Send `/mybots`
   - Select your bot
   - Go to `Bot Settings` → `Group Privacy`
   - Select `Turn off` to allow the bot to see all messages
4. Get the group ID by:
   - Sending any message in the group
   - Add [@getidsbot](https://t.me/getidsbot) to the group temporarily
   - Look for the chat ID which will be something like `-1002786284116`

### Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```
# Basic Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_GROUP_CHAT_ID=-1002786284116
TELEGRAM_CHANNEL_CHAT_ID=-1002778511379
WEBSITE_URL=https://yourdomain.com

# Enhanced Features
DAILY_SUMMARY_TIME=23:59
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
TELEGRAM_SEND_TEST=false
```

### Step 4: Set Up Webhook (For Welcome Messages)

🆕 **New Feature**: To enable welcome messages, you need to set up a webhook:

#### Option 1: Using the API Endpoint
```bash
curl -X POST https://yourdomain.com/api/telegram/webhook/set \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/api/telegram/webhook"}'
```

#### Option 2: Using Telegram API Directly
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/api/telegram/webhook", "allowed_updates": ["message", "chat_member"]}'
```

### Step 5: Restart the Server

After configuring the environment variables, restart the server:

```bash
npm restart
# or
node server.js
```

## 🧪 Testing the Enhanced Features

### Test Token Creation Notifications
```bash
curl -X POST https://yourdomain.com/api/telegram/test/token-notification
```

### 🆕 Test Welcome Messages
```bash
curl -X POST https://yourdomain.com/api/telegram/test/welcome
```

### 🆕 Test Daily Summary
```bash
curl -X POST https://yourdomain.com/api/telegram/test/daily-summary
```

### 🆕 Trigger Manual Daily Summary
```bash
curl -X POST https://yourdomain.com/api/telegram/daily-summary/trigger
```

### Check Service Status
```bash
curl https://yourdomain.com/api/telegram/status
```

## 🆕 New API Endpoints

### Webhook Management
- `POST /api/telegram/webhook` - Receive webhook updates from Telegram
- `POST /api/telegram/webhook/set` - Set webhook URL
- `GET /api/telegram/webhook/info` - Get webhook information

### Testing Endpoints
- `POST /api/telegram/test/welcome` - Send test welcome message
- `POST /api/telegram/test/daily-summary` - Send test daily summary
- `POST /api/telegram/test/token-notification` - Send test token notification

### Daily Summary Management
- `POST /api/telegram/daily-summary/trigger` - Manually trigger daily summary

### Service Status
- `GET /api/telegram/status` - Get service configuration and status

## 🔍 Troubleshooting

### Welcome Messages Not Working
- **Check webhook setup**: Use `GET /api/telegram/webhook/info` to verify webhook is set
- **Verify bot permissions**: Ensure bot is admin in the group with privacy mode disabled
- **Check logs**: Look for webhook errors in server logs
- **Test webhook**: Send a test message by having someone join/leave the group

### Daily Summaries Not Sending
- **Check cron job**: Verify `DAILY_SUMMARY_TIME` format (HH:MM)
- **Check channel permissions**: Bot must be admin in the channel
- **Manual trigger**: Use `/api/telegram/daily-summary/trigger` to test
- **Check token data**: Ensure tokens are being saved to `promo-deployments.json`

### General Issues
- **Verify environment variables**: Use `/api/telegram/status` to check configuration
- **Check bot token**: Ensure token is valid and bot is active
- **Network connectivity**: Verify server can reach `api.telegram.org`

## 🔒 Security Considerations

- **Bot Privacy Mode**: Disabled to see member joins (required for welcome messages)
- **Webhook Security**: Consider adding webhook secret validation for production
- **Rate Limiting**: Telegram has rate limits (20 messages/minute to different chats)
- **Error Handling**: All notification failures are logged but don't affect token creation

## 🛠️ Customization

### Welcome Message Format

Edit the `formatWelcomeMessage` method in `services/telegramService.js`:

```javascript
formatWelcomeMessage(userFirstName) {
  return `👋 Welcome, ${userFirstName}! Thanks for joining SolMemeCreator Community. You can create your own Solana meme tokens here: ${this.websiteUrl}. Let us know if you need help!`;
}
```

### Daily Summary Format

Edit the `formatDailySummary` method in `services/telegramService.js`:

```javascript
formatDailySummary(tokensCreated) {
  // Customize your daily summary format here
  let summaryText = `📊 Daily Recap - ${new Date().toDateString()}:\n`;
  // ... rest of formatting logic
}
```

### Daily Summary Schedule

Change the `DAILY_SUMMARY_TIME` environment variable:
```
# Examples:
DAILY_SUMMARY_TIME=23:59  # 11:59 PM UTC
DAILY_SUMMARY_TIME=12:00  # 12:00 PM UTC
DAILY_SUMMARY_TIME=06:30  # 6:30 AM UTC
```

## 📊 Monitoring and Analytics

### Service Health Check
```bash
curl https://yourdomain.com/api/telegram/status
```

Returns:
```json
{
  "success": true,
  "configured": true,
  "data": {
    "hasToken": true,
    "hasGroupChat": true,
    "hasChannelChat": true,
    "websiteUrl": "https://yourdomain.com",
    "dailySummaryTime": "23:59",
    "isFullyConfigured": true
  }
}
```

### Webhook Information
```bash
curl https://yourdomain.com/api/telegram/webhook/info
```

### Daily Summary Statistics
Check server logs for daily summary metrics:
- Number of tokens found
- Message delivery status
- Error details (if any)

## 🔄 Migration from Basic Version

If upgrading from the basic notification system:

1. **Update dependencies**: Ensure `node-cron` is installed
2. **Add new environment variables**: See Step 3 above
3. **Set up webhook**: Required for welcome messages
4. **Restart server**: All features activate automatically
5. **Test features**: Use the testing endpoints to verify functionality

## 📋 Technical Details

### Files Modified/Enhanced:

- `services/telegramService.js` - Enhanced with welcome messages and daily summaries
- `routes/telegram.js` - New route file for webhook handling and testing
- `server.js` - Added cron job scheduling and webhook route
- `package.json` - Added `node-cron` dependency
- `.env.example` - Added new environment variables
- `TELEGRAM_NOTIFICATIONS.md` - Updated documentation

### Dependencies Added:

- `node-cron` - For scheduling daily summaries

### Cron Job Schedule:
- **Daily Summary**: Runs every day at configured time (default 23:59 UTC)
- **Timezone**: UTC (configurable in server.js if needed)

### Webhook Updates Handled:
- `chat_member` - New member joins
- `message` - Regular messages (for future features)

## 📱 Advanced Configuration

### Custom Webhook Secret (Optional)

For enhanced security, you can add webhook secret validation:

1. Add to `.env`:
```
TELEGRAM_WEBHOOK_SECRET=your_secret_here
```

2. Modify webhook endpoint in `routes/telegram.js` to validate secret

### Multiple Group Support

To support multiple groups, modify the service to accept an array of group IDs:

```javascript
// In telegramService.js constructor
this.groupChatIds = config.groupChatIds || [process.env.TELEGRAM_GROUP_CHAT_ID];
```

### Database Integration

For production deployments, consider replacing the JSON file with proper database storage:

1. Use Supabase or your preferred database
2. Create tables for token records and notification logs
3. Update `getTokensCreatedToday()` method to query database

## 📖 Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Webhook Setup Guide](https://core.telegram.org/bots/api#setwebhook)
- [Chat Member Updates](https://core.telegram.org/bots/api#chatmember)
- [Cron Expression Guide](https://crontab.guru/)
- [Node-cron Documentation](https://www.npmjs.com/package/node-cron)

---

**🚀 Enhanced Features • Automated Welcome Messages • Daily Summaries • Production Ready! 📊**