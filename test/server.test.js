import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

process.env.VERIFY_TOKEN = "test-verify-token";
process.env.WHATSAPP_TOKEN = "test-whatsapp-token";
process.env.PHONE_NUMBER_ID = "test-phone-number-id";

const { app, resetAppState } = await import("../server.js");

let server;
let baseUrl;
let axiosPostCalls;
let axiosGetCalls;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test.beforeEach(() => {
  resetAppState();
  axiosPostCalls = [];
  axiosGetCalls = [];
  axios.post = async (...args) => {
    axiosPostCalls.push(args);
    return { data: { messages: [{ id: "mock-message-id" }] } };
  };
  axios.get = async (...args) => {
    axiosGetCalls.push(args);
    throw new Error("Mock media download failure");
  };
});

test("GET /webhook returns challenge for a valid verification token", async () => {
  const response = await fetch(
    `${baseUrl}/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=challenge-123`
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "challenge-123");
});

test("GET /webhook rejects an invalid verification token", async () => {
  const response = await fetch(
    `${baseUrl}/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge-123`
  );

  assert.equal(response.status, 403);
});

test("POST /webhook stores incoming text messages and updates stats", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "Ada" } }],
                messages: [
                  {
                    id: "wamid-1",
                    from: "15551234567",
                    timestamp: "1713744000",
                    type: "text",
                    text: { body: "Hello there" }
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  });

  assert.equal(response.status, 200);

  const data = await fetch(`${baseUrl}/api/alldata`).then((res) => res.json());
  assert.equal(data.stats.totalEvents, 1);
  assert.equal(data.stats.incomingCount, 1);
  assert.equal(data.stats.uniqueUsers, 1);
  assert.equal(data.events[0].id, "wamid-1");
  assert.equal(data.events[0].body, "Hello there");
  assert.equal(data.events[0].name, "Ada");
  assert.equal(data.users[0].wa_id, "15551234567");
});

test("GET /api/stats returns zero counts before events arrive", async () => {
  const stats = await fetch(`${baseUrl}/api/stats`).then((res) => res.json());

  assert.deepEqual(stats, {
    totalEvents: 0,
    totalMessages: 0,
    incomingCount: 0,
    outgoingCount: 0,
    uniqueUsers: 0,
    sentStatus: 0,
    deliveredStatus: 0,
    readStatus: 0,
    failedStatus: 0
  });
});

test("GET /api/incoming and /api/users return incoming webhook data", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "Grace" } }],
                messages: [
                  {
                    id: "wamid-filter-1",
                    from: "15550001111",
                    timestamp: "1713744020",
                    type: "text",
                    text: { body: "Dashboard data" }
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  });

  assert.equal(response.status, 200);

  const incoming = await fetch(`${baseUrl}/api/incoming`).then((res) => res.json());
  const users = await fetch(`${baseUrl}/api/users`).then((res) => res.json());

  assert.equal(incoming.length, 1);
  assert.equal(incoming[0].id, "wamid-filter-1");
  assert.equal(incoming[0].body, "Dashboard data");
  assert.equal(incoming[0].from, "15550001111");
  assert.equal(users.length, 1);
  assert.equal(users[0].wa_id, "15550001111");
  assert.equal(users[0].name, "Grace");
});

test("POST /webhook stores Unknown name when contact profile is missing", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: "unknown-contact-1",
                    from: "15550009999",
                    timestamp: "1713744025",
                    type: "text",
                    text: { body: "No profile here" }
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  });

  assert.equal(response.status, 200);

  const users = await fetch(`${baseUrl}/api/users`).then((res) => res.json());
  const incoming = await fetch(`${baseUrl}/api/incoming`).then((res) => res.json());

  assert.equal(users.length, 1);
  assert.equal(users[0].name, "Unknown");
  assert.equal(incoming[0].name, "Unknown");
});

test("POST /webhook keeps newest incoming events first", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "Order User" } }],
                messages: [
                  {
                    id: "first-message",
                    from: "15550008888",
                    timestamp: "1713744026",
                    type: "text",
                    text: { body: "First message" }
                  },
                  {
                    id: "second-message",
                    from: "15550008888",
                    timestamp: "1713744027",
                    type: "text",
                    text: { body: "Second message" }
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  });

  assert.equal(response.status, 200);

  const incoming = await fetch(`${baseUrl}/api/incoming`).then((res) => res.json());

  assert.equal(incoming.length, 2);
  assert.equal(incoming[0].id, "second-message");
  assert.equal(incoming[1].id, "first-message");
});

test("POST /webhook stores incoming image, document, audio, and video messages", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "Media User" } }],
                messages: [
                  {
                    id: "image-1",
                    from: "15550002222",
                    timestamp: "1713744030",
                    type: "image",
                    image: { id: "media-image-1", caption: "Image caption" }
                  },
                  {
                    id: "document-1",
                    from: "15550002222",
                    timestamp: "1713744031",
                    type: "document",
                    document: { id: "media-document-1", filename: "invoice.pdf" }
                  },
                  {
                    id: "audio-1",
                    from: "15550002222",
                    timestamp: "1713744032",
                    type: "audio",
                    audio: { id: "media-audio-1" }
                  },
                  {
                    id: "video-1",
                    from: "15550002222",
                    timestamp: "1713744033",
                    type: "video",
                    video: { id: "media-video-1", caption: "Video caption" }
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  });

  assert.equal(response.status, 200);

  const incoming = await fetch(`${baseUrl}/api/incoming`).then((res) => res.json());
  const byId = Object.fromEntries(incoming.map((event) => [event.id, event]));

  assert.equal(incoming.length, 4);
  assert.equal(byId["image-1"].body, "Image caption");
  assert.equal(byId["image-1"].mediaId, "media-image-1");
  assert.equal(byId["document-1"].body, "invoice.pdf");
  assert.equal(byId["document-1"].mediaId, "media-document-1");
  assert.equal(byId["audio-1"].body, "audio");
  assert.equal(byId["audio-1"].mediaId, "media-audio-1");
  assert.equal(byId["video-1"].body, "Video caption");
  assert.equal(byId["video-1"].mediaId, "media-video-1");
  assert.equal(axiosGetCalls.length, 4);
});

test("POST /webhook stores outgoing status updates", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: "status-1",
                    status: "delivered",
                    recipient_id: "15557654321",
                    timestamp: "1713744010",
                    pricing: { billable: true }
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  });

  assert.equal(response.status, 200);

  const stats = await fetch(`${baseUrl}/api/stats`).then((res) => res.json());
  const statuses = await fetch(`${baseUrl}/api/status`).then((res) => res.json());
  assert.equal(stats.totalEvents, 1);
  assert.equal(stats.deliveredStatus, 1);
  assert.equal(statuses[0].id, "status-1");
  assert.equal(statuses[0].recipient, "15557654321");
});

test("GET /api/stats counts sent, delivered, read, and failed statuses", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: "sent-1", status: "sent", recipient_id: "15550003333", timestamp: "1713744040" },
                  { id: "delivered-1", status: "delivered", recipient_id: "15550003333", timestamp: "1713744041" },
                  { id: "read-1", status: "read", recipient_id: "15550003333", timestamp: "1713744042" },
                  { id: "failed-1", status: "failed", recipient_id: "15550003333", timestamp: "1713744043" }
                ]
              }
            }
          ]
        }
      ]
    })
  });

  assert.equal(response.status, 200);

  const stats = await fetch(`${baseUrl}/api/stats`).then((res) => res.json());

  assert.equal(stats.totalEvents, 4);
  assert.equal(stats.sentStatus, 1);
  assert.equal(stats.deliveredStatus, 1);
  assert.equal(stats.readStatus, 1);
  assert.equal(stats.failedStatus, 1);
});

test("GET /api/alldata returns stats, events, grouped lists, users, and timestamp", async () => {
  await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "All Data User" } }],
                messages: [
                  {
                    id: "alldata-message-1",
                    from: "15550004444",
                    timestamp: "1713744050",
                    type: "text",
                    text: { body: "All data message" }
                  }
                ],
                statuses: [
                  {
                    id: "alldata-status-1",
                    status: "read",
                    recipient_id: "15550004444",
                    timestamp: "1713744051"
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  });

  const data = await fetch(`${baseUrl}/api/alldata`).then((res) => res.json());

  assert.equal(data.stats.totalEvents, 2);
  assert.equal(data.events.length, 2);
  assert.equal(data.incoming.length, 1);
  assert.equal(data.statuses.length, 1);
  assert.equal(data.users.length, 1);
  assert.equal(data.users[0].wa_id, "15550004444");
  assert.ok(Date.parse(data.timestamp));
});

test("GET /api/alldata returns empty grouped lists before events arrive", async () => {
  const data = await fetch(`${baseUrl}/api/alldata`).then((res) => res.json());

  assert.equal(data.stats.totalEvents, 0);
  assert.deepEqual(data.events, []);
  assert.deepEqual(data.incoming, []);
  assert.deepEqual(data.outgoing, []);
  assert.deepEqual(data.statuses, []);
  assert.deepEqual(data.users, []);
  assert.ok(Date.parse(data.timestamp));
});

test("POST /webhook rejects non-WhatsApp payloads", async () => {
  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object: "not_whatsapp" })
  });

  assert.equal(response.status, 404);
});

test("POST /api/send validates required fields before sending", async () => {
  const response = await fetch(`${baseUrl}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: "15551234567" })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Missing 'to' or 'text' parameter" });
});

test("POST /api/send records outgoing text and calls WhatsApp API", async () => {
  const response = await fetch(`${baseUrl}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "15551234567",
      text: "Project test message"
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    to: "15551234567",
    text: "Project test message"
  });

  const outgoing = await fetch(`${baseUrl}/api/outgoing`).then((res) => res.json());
  const messages = await fetch(`${baseUrl}/api/messages`).then((res) => res.json());

  assert.equal(outgoing.length, 1);
  assert.equal(outgoing[0].direction, "outgoing");
  assert.equal(outgoing[0].body, "Project test message");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].body, "Project test message");
  assert.equal(axiosPostCalls.length, 1);
  assert.equal(axiosPostCalls[0][1].to, "15551234567");
  assert.equal(axiosPostCalls[0][1].text.body, "Project test message");
});

test("POST /api/send still records outgoing message when WhatsApp API fails", async () => {
  axios.post = async (...args) => {
    axiosPostCalls.push(args);
    throw new Error("WhatsApp API unavailable");
  };

  const response = await fetch(`${baseUrl}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "15551234567",
      text: "Failure path message"
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    to: "15551234567",
    text: "Failure path message"
  });

  const outgoing = await fetch(`${baseUrl}/api/outgoing`).then((res) => res.json());

  assert.equal(outgoing.length, 1);
  assert.equal(outgoing[0].body, "Failure path message");
  assert.equal(axiosPostCalls.length, 1);
});

test("POST /send validates required fields before sending", async () => {
  const response = await fetch(`${baseUrl}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "15551234567" })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Missing 'text' or 'phone' parameter" });
});

test("POST /send records outgoing text for legacy clients", async () => {
  const response = await fetch(`${baseUrl}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: "15559876543",
      text: "Legacy send message"
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });

  const outgoing = await fetch(`${baseUrl}/api/outgoing`).then((res) => res.json());

  assert.equal(outgoing.length, 1);
  assert.equal(outgoing[0].from, "15559876543");
  assert.equal(outgoing[0].body, "Legacy send message");
  assert.equal(axiosPostCalls.length, 1);
});

test("GET /api/outgoing returns only outgoing text message events", async () => {
  await fetch(`${baseUrl}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "15551234567",
      text: "Outgoing text only"
    })
  });

  await fetch(`${baseUrl}/api/send/media`, {
    method: "POST",
    body: new URLSearchParams({
      to: "15551234567",
      type: "image",
      mediaUrl: "https://example.com/only-alldata.jpg",
      useUrl: "true"
    })
  });

  const outgoing = await fetch(`${baseUrl}/api/outgoing`).then((res) => res.json());
  const allData = await fetch(`${baseUrl}/api/alldata`).then((res) => res.json());

  assert.equal(outgoing.length, 1);
  assert.equal(outgoing[0].type, "message");
  assert.equal(outgoing[0].body, "Outgoing text only");
  assert.equal(allData.outgoing.length, 2);
});

test("POST /api/send/media validates recipient and type", async () => {
  const response = await fetch(`${baseUrl}/api/send/media`, {
    method: "POST",
    body: new URLSearchParams({
      to: "15551234567"
    })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Missing 'to/phone' or 'type' parameter" });
});

test("POST /api/send/media validates file or mediaUrl", async () => {
  const response = await fetch(`${baseUrl}/api/send/media`, {
    method: "POST",
    body: new URLSearchParams({
      to: "15551234567",
      type: "image"
    })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "No file uploaded" });
});

test("POST /api/send/media sends URL media and records outgoing event", async () => {
  const response = await fetch(`${baseUrl}/api/send/media`, {
    method: "POST",
    body: new URLSearchParams({
      to: "15551234567",
      type: "image",
      mediaUrl: "https://example.com/image.jpg",
      caption: "Project image",
      useUrl: "true"
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    to: "15551234567",
    type: "image",
    mediaUrl: "https://example.com/image.jpg",
    caption: "Project image",
    method: "url"
  });

  const data = await fetch(`${baseUrl}/api/alldata`).then((res) => res.json());

  assert.equal(data.outgoing.length, 1);
  assert.equal(data.outgoing[0].type, "image");
  assert.equal(data.outgoing[0].msgType, "image");
  assert.equal(data.outgoing[0].fileUrl, "https://example.com/image.jpg");
  assert.equal(data.outgoing[0].body, "Project image");
  assert.equal(axiosPostCalls.length, 1);
  assert.equal(axiosPostCalls[0][1].to, "15551234567");
  assert.equal(axiosPostCalls[0][1].type, "image");
  assert.equal(axiosPostCalls[0][1].image.link, "https://example.com/image.jpg");
  assert.equal(axiosPostCalls[0][1].image.caption, "Project image");
});

test("POST /api/send/media accepts phone as recipient alias", async () => {
  const response = await fetch(`${baseUrl}/api/send/media`, {
    method: "POST",
    body: new URLSearchParams({
      phone: "15556667777",
      type: "document",
      mediaUrl: "https://example.com/report.pdf",
      caption: "Report",
      useUrl: "true"
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    to: "15556667777",
    type: "document",
    mediaUrl: "https://example.com/report.pdf",
    caption: "Report",
    method: "url"
  });

  const data = await fetch(`${baseUrl}/api/alldata`).then((res) => res.json());

  assert.equal(data.outgoing.length, 1);
  assert.equal(data.outgoing[0].from, "15556667777");
  assert.equal(data.outgoing[0].type, "document");
  assert.equal(axiosPostCalls[0][1].to, "15556667777");
  assert.equal(axiosPostCalls[0][1].document.link, "https://example.com/report.pdf");
});

test("GET /ui and /dashboard load dashboard HTML pages", async () => {
  const modernDashboard = await fetch(`${baseUrl}/ui`);
  const legacyDashboard = await fetch(`${baseUrl}/dashboard`);

  assert.equal(modernDashboard.status, 200);
  assert.match(modernDashboard.headers.get("content-type"), /text\/html/);
  assert.match(await modernDashboard.text(), /WhatsApp/i);

  assert.equal(legacyDashboard.status, 200);
  assert.match(legacyDashboard.headers.get("content-type"), /text\/html/);
  assert.match(await legacyDashboard.text(), /WhatsApp/i);
});
