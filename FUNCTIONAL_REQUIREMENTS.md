# Functional Requirements

This document defines functional requirements for the WhatsApp Bot Dashboard project and maps them to current automated tests.

## Requirement Coverage Summary

| FR ID | Area | Functional Requirement | Current Coverage |
| --- | --- | --- | --- |
| FR-001 | Webhook Verification | The app must verify webhook setup when Meta sends a valid verify token and challenge. | Automated |
| FR-002 | Webhook Security | The app must reject webhook verification requests with an invalid token. | Automated |
| FR-003 | Incoming Messages | The app must receive and store incoming WhatsApp text messages. | Automated |
| FR-004 | Incoming Users | The app must track unique users from incoming webhook messages. | Automated |
| FR-005 | Incoming Users | The app must use `Unknown` when the contact profile name is missing. | Automated |
| FR-006 | Event Ordering | The app must show newest received events before older events. | Automated |
| FR-007 | Incoming Media | The app must receive image, document, audio, and video webhook messages. | Automated |
| FR-008 | Incoming Media | The app must preserve media IDs and display text such as captions, filenames, or media type labels. | Automated |
| FR-009 | Media Download | The app must continue storing media webhook events even when media download fails. | Automated |
| FR-010 | Status Events | The app must receive and store WhatsApp status events. | Automated |
| FR-011 | Status Counts | The app must count sent, delivered, read, and failed statuses. | Automated |
| FR-012 | Stats API | The app must return zero stats when no events have arrived. | Automated |
| FR-013 | Stats API | The app must return aggregate event, message, user, and status counts. | Automated |
| FR-014 | All Data API | The app must return stats, all events, grouped events, users, and timestamp from `/api/alldata`. | Automated |
| FR-015 | All Data API | The app must return empty grouped lists before any events arrive. | Automated |
| FR-016 | Filter APIs | The app must return incoming events from `/api/incoming`. | Automated |
| FR-017 | Filter APIs | The app must return tracked users from `/api/users`. | Automated |
| FR-018 | Filter APIs | The app must return outgoing text message events from `/api/outgoing`. | Automated |
| FR-019 | Filter APIs | The app must return outgoing text message events from `/api/messages`. | Automated |
| FR-020 | Text Sending | The app must validate required fields for `/api/send`. | Automated |
| FR-021 | Text Sending | The app must record outgoing text messages sent through `/api/send`. | Automated |
| FR-022 | Text Sending | The app must create the correct WhatsApp API payload for text sends. | Automated |
| FR-023 | Error Handling | The app must keep a local outgoing record when the WhatsApp text-send API call fails. | Automated |
| FR-024 | Legacy Sending | The app must validate required fields for `/send`. | Automated |
| FR-025 | Legacy Sending | The app must record outgoing text messages sent through `/send`. | Automated |
| FR-026 | Media Sending | The app must validate recipient and media type for `/api/send/media`. | Automated |
| FR-027 | Media Sending | The app must require a file or media URL for media sends. | Automated |
| FR-028 | Media Sending | The app must send URL-based media and record the outgoing media event. | Automated |
| FR-029 | Media Sending | The app must accept `phone` as a recipient alias for media sends. | Automated |
| FR-030 | Dashboard UI | The app must serve the modern dashboard from `/ui`. | Automated |
| FR-031 | Dashboard UI | The app must serve the legacy dashboard from `/dashboard`. | Automated |

## Future Functional Requirements

These are useful next requirements to implement or clarify before adding tests:

| FR ID | Area | Functional Requirement | Suggested Test Type |
| --- | --- | --- | --- |
| FR-032 | File Upload Media | The app should send uploaded media files through WhatsApp media upload. | Integration |
| FR-033 | Media Type Validation | The app should reject unsupported media types before calling WhatsApp. | Validation |
| FR-034 | Text Boundary | The app should define behavior for empty text messages. | Boundary |
| FR-035 | Text Boundary | The app should define behavior for very long text messages. | Boundary |
| FR-036 | Request Safety | The app should handle malformed JSON without crashing. | Error Handling |
| FR-037 | Persistent Storage | The app should persist events if a database is added. | Integration |
| FR-038 | Dashboard Rendering | The dashboard should visually render messages, users, stats, and statuses from API data. | UI |

## Notes

- The current app stores events in memory, so data resets when the server restarts.
- The current tests mock WhatsApp API calls; they do not require a real WhatsApp token.
- Incoming media download is mocked as a failure in tests to prove the webhook event is still stored safely.
