# WhatsApp Bot Dashboard

A small Express app for receiving WhatsApp Business webhook events, tracking message/status activity in memory, sending WhatsApp messages/media, and viewing activity through a dashboard UI.

## Features

- Verifies WhatsApp webhook subscriptions.
- Receives incoming WhatsApp messages and delivery/read/failure statuses.
- Stores webhook events in memory for dashboard/API access.
- Tracks unique WhatsApp users by sender ID.
- Sends text messages through the WhatsApp Cloud API.
- Sends media by URL or by uploading files to WhatsApp first.
- Serves uploaded media from the local `uploads` directory.
- Includes route-level tests for webhook and validation behavior.

## Requirements

- Node.js 18 or newer.
- npm.
- A WhatsApp Business Cloud API app and phone number.

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```env
PORT=3001
VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_TOKEN=your_whatsapp_cloud_api_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

`PORT` is optional. If omitted, the app runs on `3001`.

## Running The App

Start the server:

```bash
npm start
```

Open the dashboard:

```text
http://localhost:3001/ui
```

The legacy dashboard is also available at:

```text
http://localhost:3001/dashboard
```

Uploaded media files are served from:

```text
http://localhost:3001/uploads/<filename>
```

## Testing

Run the test suite:

```bash
npm test
```

The tests use Node's built-in test module and start the Express app on an ephemeral local port. They cover webhook verification, incoming message handling, status events, invalid webhook payloads, and request validation for text-send endpoints.

Detailed test case documentation is available in `TEST_CASES.md`.
Functional requirements are available in `FUNCTIONAL_REQUIREMENTS.md`.

## WhatsApp Webhook

Configure your WhatsApp Business app webhook callback URL to point to:

```text
https://your-public-domain/webhook
```

For local development, use a tunnel such as ngrok or Cloudflare Tunnel and forward it to your local server port.

During webhook setup, Meta sends a `GET /webhook` verification request. The app compares `hub.verify_token` with `VERIFY_TOKEN` from `.env` and returns `hub.challenge` when the token matches.

Runtime webhook events are received through `POST /webhook`.

## API Routes

### Dashboard And Data

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/ui` | Serves `dashboard-modern.html`. |
| `GET` | `/dashboard` | Serves `dashboard.html`. |
| `GET` | `/api/stats` | Returns aggregate counts for events, messages, users, and statuses. |
| `GET` | `/api/alldata` | Returns stats, all events, filtered event groups, users, and timestamp. |
| `GET` | `/api/messages` | Returns events with `type === "message"`. |
| `GET` | `/api/incoming` | Returns incoming events. |
| `GET` | `/api/outgoing` | Returns outgoing message events. |
| `GET` | `/api/status` | Returns status events. |
| `GET` | `/api/users` | Returns tracked WhatsApp users. |

### Sending Text

`POST /api/send`

```json
{
  "to": "15551234567",
  "text": "Hello from the dashboard"
}
```

`POST /send`

```json
{
  "phone": "15551234567",
  "text": "Hello from the dashboard"
}
```

Both routes require a recipient and message text. The app records the outgoing message locally before calling the WhatsApp Cloud API.

### Sending Media

`POST /api/send/media`

Send as `multipart/form-data`.

Fields:

| Field | Required | Description |
| --- | --- | --- |
| `to` or `phone` | Yes | Recipient phone number. |
| `type` | Yes | One of `image`, `audio`, `video`, or `document`. |
| `file` | Required unless `mediaUrl` is present | Uploaded media file. |
| `mediaUrl` | Required unless `file` is present | Public media URL. |
| `caption` | No | Optional caption. |
| `useUrl` | No | Set to `true` to send using a media URL instead of uploading the file to WhatsApp. |

When `useUrl` is not `true`, the app uploads the file to WhatsApp, then sends the returned media ID.

## Runtime Data

Event and user data is stored in memory:

- Restarting the server clears all events and sessions.
- Uploaded files remain in the `uploads` directory.
- This app does not currently use a database.

## Project Structure

```text
.
+-- dashboard-modern.html
+-- dashboard.html
+-- package.json
+-- server.js
+-- test/
|   +-- server.test.js
+-- uploads/
+-- WhatsAppDashboard.css
+-- WhatsAppDashboard.jsx
```

## Notes

- Keep `.env` private. It contains the WhatsApp API token.
- `node_modules`, `.env`, `server.log`, and `$null` are ignored by Git.
- The server exports the Express app and a test-only state reset helper so tests can run without starting the production listener.
