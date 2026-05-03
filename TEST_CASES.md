# Test Cases For WhatsApp Bot Dashboard

This document contains developer/tester style test cases for this project. The automated test cases are implemented in `test/server.test.js`.

Functional requirements are tracked in `FUNCTIONAL_REQUIREMENTS.md`.

## How To Run Automated Tests

```bash
npm test
```

## Test Environment

| Item | Value |
| --- | --- |
| Test runner | Node.js built-in `node:test` |
| Test file | `test/server.test.js` |
| Server mode | Express app runs on a temporary local port |
| Real WhatsApp API calls | Mocked in tests |
| State handling | In-memory events and sessions are reset before each test |

Test environment variables:

```env
VERIFY_TOKEN=test-verify-token
WHATSAPP_TOKEN=test-whatsapp-token
PHONE_NUMBER_ID=test-phone-number-id
```

## Automated Test Cases

| Test ID | Module | Scenario | Test Data | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-001 | Webhook Verification | Verify webhook using correct token | `hub.verify_token=test-verify-token`, `hub.challenge=challenge-123` | API returns `200` and response body `challenge-123` | Automated |
| TC-002 | Webhook Verification | Reject webhook using wrong token | `hub.verify_token=wrong-token` | API returns `403` | Automated |
| TC-003 | Incoming Message | Store incoming text webhook message | Sender `15551234567`, name `Ada`, body `Hello there` | Message is stored, incoming count is `1`, unique user count is `1` | Automated |
| TC-004 | Dashboard APIs | Return incoming message and user data | Sender `15550001111`, name `Grace`, body `Dashboard data` | `/api/incoming` returns the message and `/api/users` returns the sender | Automated |
| TC-005 | Status Webhook | Store outgoing delivery status | Status `delivered`, recipient `15557654321` | Status event is stored and delivered count is `1` | Automated |
| TC-006 | Webhook Validation | Reject non-WhatsApp webhook payload | `object=not_whatsapp` | API returns `404` | Automated |
| TC-007 | Send Text Validation | Validate missing text in `/api/send` | `{ "to": "15551234567" }` | API returns `400` with missing parameter error | Automated |
| TC-008 | Send Text | Send text using `/api/send` | `to=15551234567`, text `Project test message` | Outgoing event is stored and WhatsApp API payload is created | Automated |
| TC-009 | Legacy Send Validation | Validate missing text in `/send` | `{ "phone": "15551234567" }` | API returns `400` with missing parameter error | Automated |
| TC-010 | Legacy Send | Send text using `/send` | `phone=15559876543`, text `Legacy send message` | Outgoing event is stored and WhatsApp API payload is created | Automated |
| TC-011 | Media Validation | Validate missing media type | `to=15551234567` | API returns `400` with missing recipient/type error | Automated |
| TC-012 | Media Validation | Validate missing file or media URL | `to=15551234567`, `type=image` | API returns `400` with `No file uploaded` | Automated |
| TC-013 | Media Send | Send media by URL | Image URL `https://example.com/image.jpg`, caption `Project image` | Outgoing media event is stored and WhatsApp image payload is created | Automated |
| TC-014 | Incoming Media | Store image, document, audio, and video webhook messages | Media IDs and captions/filename | All media events are stored with correct body and media ID | Automated |
| TC-015 | Stats | Count sent, delivered, read, and failed statuses | One status event for each status type | `/api/stats` returns correct status counts | Automated |
| TC-016 | All Data API | Return stats, events, grouped lists, users, and timestamp | One incoming message and one status event | `/api/alldata` returns complete grouped dashboard data | Automated |
| TC-017 | Error Handling | WhatsApp API fails while sending text | Mocked WhatsApp API failure | Outgoing event is still stored and route responds successfully | Automated |
| TC-018 | Dashboard UI | Load dashboard pages | `/ui` and `/dashboard` | Both dashboard pages return HTML successfully | Automated |
| TC-019 | Stats API | Return zero state before events arrive | No webhook events | `/api/stats` returns all counts as `0` | Automated |
| TC-020 | Incoming Users | Store fallback name when contact profile is missing | Incoming text message without `contacts` | Event and user name are stored as `Unknown` | Automated |
| TC-021 | Event Ordering | Keep newest events first | Two incoming messages in one webhook payload | Newer message appears before older message | Automated |
| TC-022 | All Data API | Return empty grouped lists before events arrive | No webhook events | `/api/alldata` returns empty event/user arrays and a timestamp | Automated |
| TC-023 | Filter APIs | Return only outgoing text messages from `/api/outgoing` | One outgoing text and one outgoing media event | `/api/outgoing` returns only the text message, while `/api/alldata` includes both | Automated |
| TC-024 | Media Send | Accept `phone` as recipient alias | URL document send with `phone` instead of `to` | Outgoing media event and WhatsApp payload use the phone number | Automated |

## Detailed Test Cases

### TC-001: Verify Webhook With Correct Token

Precondition:

- Server is running.
- `VERIFY_TOKEN` is configured as `test-verify-token`.

Steps:

1. Send `GET /webhook`.
2. Pass `hub.mode=subscribe`.
3. Pass `hub.verify_token=test-verify-token`.
4. Pass `hub.challenge=challenge-123`.

Expected Result:

- Response status is `200`.
- Response body is `challenge-123`.

### TC-002: Reject Webhook With Wrong Token

Steps:

1. Send `GET /webhook`.
2. Pass `hub.mode=subscribe`.
3. Pass `hub.verify_token=wrong-token`.
4. Pass `hub.challenge=challenge-123`.

Expected Result:

- Response status is `403`.

### TC-003: Store Incoming Text Message

Steps:

1. Send `POST /webhook`.
2. Use `object=whatsapp_business_account`.
3. Include one text message from `15551234567`.
4. Include contact name `Ada`.
5. Call `GET /api/alldata`.

Expected Result:

- Webhook response status is `200`.
- Total events count is `1`.
- Incoming count is `1`.
- Unique users count is `1`.
- Stored message body is `Hello there`.
- Stored user ID is `15551234567`.

### TC-004: Verify Dashboard Incoming And User APIs

Steps:

1. Send an incoming text webhook message.
2. Call `GET /api/incoming`.
3. Call `GET /api/users`.

Expected Result:

- `/api/incoming` returns the incoming message.
- `/api/users` returns the WhatsApp sender with the correct name.

### TC-005: Store Delivery Status Event

Steps:

1. Send `POST /webhook`.
2. Use `object=whatsapp_business_account`.
3. Include one status event with status `delivered`.
4. Call `GET /api/stats`.
5. Call `GET /api/status`.

Expected Result:

- Status event is stored.
- Total events count is `1`.
- Delivered status count is `1`.
- Recipient ID is stored correctly.

### TC-006: Reject Invalid Webhook Payload

Steps:

1. Send `POST /webhook`.
2. Use payload `{ "object": "not_whatsapp" }`.

Expected Result:

- Response status is `404`.

### TC-007: Validate Missing Text In `/api/send`

Steps:

1. Send `POST /api/send`.
2. Include only `to`.
3. Do not include `text`.

Expected Result:

- Response status is `400`.
- Error message is `Missing 'to' or 'text' parameter`.

### TC-008: Send Text Using `/api/send`

Steps:

1. Send `POST /api/send`.
2. Include recipient `15551234567`.
3. Include text `Project test message`.
4. Call `GET /api/outgoing`.
5. Call `GET /api/messages`.

Expected Result:

- Response status is `200`.
- Response contains `success: true`.
- Outgoing event is stored.
- Message body is `Project test message`.
- WhatsApp API payload contains the correct recipient and text.

### TC-009: Validate Missing Text In `/send`

Steps:

1. Send `POST /send`.
2. Include only `phone`.
3. Do not include `text`.

Expected Result:

- Response status is `400`.
- Error message is `Missing 'text' or 'phone' parameter`.

### TC-010: Send Text Using `/send`

Steps:

1. Send `POST /send`.
2. Include phone `15559876543`.
3. Include text `Legacy send message`.
4. Call `GET /api/outgoing`.

Expected Result:

- Response status is `200`.
- Response contains `success: true`.
- Outgoing event is stored with phone `15559876543`.

### TC-011: Validate Missing Media Type

Steps:

1. Send `POST /api/send/media`.
2. Include recipient.
3. Do not include media type.

Expected Result:

- Response status is `400`.
- Error message is `Missing 'to/phone' or 'type' parameter`.

### TC-012: Validate Missing File Or Media URL

Steps:

1. Send `POST /api/send/media`.
2. Include recipient.
3. Include media type `image`.
4. Do not upload a file.
5. Do not include `mediaUrl`.

Expected Result:

- Response status is `400`.
- Error message is `No file uploaded`.

### TC-013: Send Media By URL

Steps:

1. Send `POST /api/send/media`.
2. Include recipient `15551234567`.
3. Include type `image`.
4. Include media URL `https://example.com/image.jpg`.
5. Include caption `Project image`.
6. Set `useUrl=true`.
7. Call `GET /api/alldata`.

Expected Result:

- Response status is `200`.
- Response contains `success: true`.
- Outgoing media event is stored.
- Media URL is stored in `fileUrl`.
- WhatsApp API payload contains image link and caption.

### TC-014: Store Incoming Media Messages

Steps:

1. Send `POST /webhook`.
2. Include image, document, audio, and video messages.
3. Include media IDs for each message.
4. Include caption for image and video.
5. Include filename for document.
6. Call `GET /api/incoming`.

Expected Result:

- Response status is `200`.
- Four incoming events are stored.
- Image body is stored from caption.
- Document body is stored from filename.
- Audio body is stored as `audio`.
- Video body is stored from caption.
- Media IDs are stored for all media messages.

### TC-015: Verify All Status Counts

Steps:

1. Send `POST /webhook`.
2. Include status events for `sent`, `delivered`, `read`, and `failed`.
3. Call `GET /api/stats`.

Expected Result:

- Total events count is `4`.
- Sent count is `1`.
- Delivered count is `1`.
- Read count is `1`.
- Failed count is `1`.

### TC-016: Verify `/api/alldata`

Steps:

1. Send one incoming message webhook event.
2. Send one status webhook event.
3. Call `GET /api/alldata`.

Expected Result:

- Response contains `stats`.
- Response contains all `events`.
- Response contains grouped `incoming`.
- Response contains grouped `statuses`.
- Response contains tracked `users`.
- Response contains a valid timestamp.

### TC-017: Handle WhatsApp API Failure

Steps:

1. Mock WhatsApp API text-send failure.
2. Send `POST /api/send`.
3. Include valid recipient and text.
4. Call `GET /api/outgoing`.

Expected Result:

- Route responds successfully based on current project behavior.
- Outgoing message is still stored locally.
- WhatsApp API call was attempted.

### TC-018: Load Dashboard Pages

Steps:

1. Send `GET /ui`.
2. Send `GET /dashboard`.

Expected Result:

- `/ui` returns `200`.
- `/ui` returns HTML content.
- `/dashboard` returns `200`.
- `/dashboard` returns HTML content.

### TC-019: Verify Empty Stats

Steps:

1. Start with no events.
2. Call `GET /api/stats`.

Expected Result:

- All counters return `0`.
- No users, messages, or statuses are counted.

### TC-020: Store Unknown Contact Name

Steps:

1. Send an incoming text webhook message.
2. Do not include contact profile data.
3. Call `GET /api/users`.
4. Call `GET /api/incoming`.

Expected Result:

- User name is stored as `Unknown`.
- Incoming event name is stored as `Unknown`.

### TC-021: Keep Newest Events First

Steps:

1. Send one webhook payload containing two text messages.
2. Put the older message first.
3. Put the newer message second.
4. Call `GET /api/incoming`.

Expected Result:

- Newer message appears at index `0`.
- Older message appears after it.

### TC-022: Verify Empty `/api/alldata`

Steps:

1. Start with no events.
2. Call `GET /api/alldata`.

Expected Result:

- `events` is an empty array.
- `incoming` is an empty array.
- `outgoing` is an empty array.
- `statuses` is an empty array.
- `users` is an empty array.
- Response contains a valid timestamp.

### TC-023: Verify Outgoing Filter API

Steps:

1. Send one text message through `/api/send`.
2. Send one media message through `/api/send/media`.
3. Call `GET /api/outgoing`.
4. Call `GET /api/alldata`.

Expected Result:

- `/api/outgoing` returns only the outgoing text message event.
- `/api/alldata` includes both outgoing text and outgoing media events.

### TC-024: Send Media Using `phone` Alias

Steps:

1. Send `POST /api/send/media`.
2. Include `phone`.
3. Do not include `to`.
4. Include media type `document`.
5. Include a media URL.
6. Set `useUrl=true`.

Expected Result:

- Response status is `200`.
- Response uses `phone` as recipient.
- Outgoing document event is stored.
- WhatsApp API payload uses the same phone number.

## Additional Manual Test Cases To Add Later

| Test ID | Module | Scenario | Expected Result |
| --- | --- | --- | --- |
| TC-019 | File Upload Media | Send uploaded document | File is uploaded to WhatsApp and outgoing document event is stored. |
| TC-020 | Boundary | Send empty text message | App should reject empty message text or define expected behavior. |
| TC-021 | Boundary | Send very long text message | App should handle or reject based on WhatsApp API limits. |
| TC-022 | Boundary | Send unsupported media type | App should reject unsupported media type. |
| TC-023 | Security | Send malformed JSON payload | App should return an error without crashing. |
| TC-024 | UI | Verify dashboard displays API data in browser | Dashboard should render message/status/user data correctly. |
