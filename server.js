import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import FormData from "form-data";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 3001;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const allEvents = [];
const sessions = new Map();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

app.get("/ui", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard-modern.html"));
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        if (value.messages) {
          for (const msg of value.messages) {
            console.log('Full message:', JSON.stringify(msg));
            const msgType = msg.type || 'unknown';
            let eventBody = msg.text?.body || '';
            let mediaId = null;
            let fileUrl = null;
            
            // Get media_id and download file
            if (msgType === 'document') {
              mediaId = msg.document?.id;
              eventBody = msg.document?.filename || msg.document?.mime_type || 'document';
            } else if (msgType === 'image') {
              mediaId = msg.image?.id;
              eventBody = msg.image?.caption || 'image';
            } else if (msgType === 'audio') {
              mediaId = msg.audio?.id;
              eventBody = 'audio';
            } else if (msgType === 'video') {
              mediaId = msg.video?.id;
              eventBody = msg.video?.caption || 'video';
            }
            
            // Download media file if we have media_id
            console.log('Checking mediaId:', mediaId);
            if (mediaId) {
              console.log('Attempting to download media:', mediaId);
              try {
                fileUrl = await downloadMedia(mediaId);
                console.log('Download result:', fileUrl);
              } catch (e) {
                console.error('Error downloading media:', e.message);
                console.log(e.response?.data);
              }
            } else {
              console.log('No mediaId found, skipping download');
            }
            
            const event = {
              id: msg.id,
              type: msg.type,
              direction: "incoming",
              from: msg.from,
              name: value.contacts?.[0]?.profile?.name || "Unknown",
              body: eventBody,
              msgType: msg.type,
              mediaId: mediaId,
              fileUrl: fileUrl,
              timestamp: msg.timestamp,
              displayTime: new Date(parseInt(msg.timestamp) * 1000).toLocaleString(),
              createdAt: new Date().toISOString()
            };
            allEvents.unshift(event);
            sessions.set(msg.from, { name: event.name, lastSeen: event.createdAt });

            // Auto-reply disabled - messages appear only once without duplicate
            // try {
            // const msgType = msg.type;
            // let replyText = 'Message received';
            // if (msgType === 'text') {
            //   const txt = msg.text?.body;
            //   replyText = txt ? `You said: ${txt}` : 'Message received';
            // } else if (msgType === 'image') {
            //   replyText = 'I received your image';
            // } else if (msgType === 'audio') {
            //   replyText = 'I received your audio';
            // } else if (msgType === 'video') {
            //   replyText = 'I received your video';
            // } else if (msgType === 'document') {
            //   replyText = 'I received your PDF document';
            // }
            // sendMessage(msg.from, replyText);
            // } catch (e) {
            //   console.error("Error sending auto-reply:", e.message);
            // }
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            const event = {
              id: status.id,
              type: "status",
              direction: "outgoing",
              status: status.status,
              recipient: status.recipient_id,
              timestamp: status.timestamp,
              displayTime: new Date(parseInt(status.timestamp) * 1000).toLocaleString(),
              pricing: status.pricing,
              createdAt: new Date().toISOString()
            };
            allEvents.unshift(event);
          }
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

async function sendMessage(to, text) {
  const messageText = text || 'Message received';
  const event = {
    id: "out_" + Date.now(),
    type: "message",
    direction: "outgoing",
    from: to,
    body: messageText,
    displayTime: new Date().toLocaleString(),
    createdAt: new Date().toISOString()
  };
  allEvents.unshift(event);

  axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: "whatsapp", to: to, text: { body: messageText } },
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" } }
  ).catch(e => console.error("Error sending auto-reply:", e.message));
}

async function downloadMedia(mediaId) {
  try {
    console.log('Downloading media:', mediaId);
    const mediaRes = await axios.get(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    console.log('Media info:', JSON.stringify(mediaRes.data));
    const url = mediaRes.data.url;
    const mimeType = mediaRes.data.mime_type || 'application/octet-stream';
    const ext = mimeType.split('/')[1] || 'bin';
    const filename = `${Date.now()}-${mediaId}.${ext}`;
    const filepath = path.join(uploadPath, filename);
    const fileRes = await axios.get(url, { 
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
    fs.writeFileSync(filepath, Buffer.from(fileRes.data));
    const fileUrl = `http://localhost:${PORT}/uploads/${filename}`;
    console.log('File saved:', fileUrl);
    return fileUrl;
  } catch (e) {
    console.error('Download error:', e.message);
    if (e.response) console.error('Status:', e.response.status, 'Data:', e.response.data);
    return null;
  }
}

async function sendMedia(to, mediaType, mediaUrl, caption) {
  const mediaTypes = {
    image: "image",
    audio: "audio",
    video: "video",
    document: "document"
  };
  
  const event = {
    id: "out_" + Date.now(),
    type: mediaType,
    direction: "outgoing",
    from: to,
    body: caption || mediaUrl,
    msgType: mediaType,
    fileUrl: mediaUrl,
    mediaUrl: mediaUrl,
    displayTime: new Date().toLocaleString(),
    createdAt: new Date().toISOString()
  };
  allEvents.unshift(event);

  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: mediaTypes[mediaType],
    [mediaTypes[mediaType]]: { link: mediaUrl }
  };
  
  if (caption) {
    payload[mediaTypes[mediaType]].caption = caption;
  }

  axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    payload,
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" } }
  ).catch(e => console.error("Error sending media:", e.message));
}

async function uploadMediaToWhatsApp(filePath, mimeType) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('type', mimeType);
  form.append('messaging_product', 'whatsapp');

  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/media`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${WHATSAPP_TOKEN}`
      }
    }
  );
  
  return response.data.id;
}

async function sendMediaWithId(to, mediaType, mediaId, caption, filename, fileUrl) {
  const mediaTypes = {
    image: 'image',
    audio: 'audio',
    video: 'video',
    document: 'document'
  };

  const mediaPayload = {
    id: mediaId
  };

  const displayCaption = caption || filename || 'Document';

  if (caption) {
    mediaPayload.caption = caption;
  }

  if (mediaType === 'document' && filename) {
    mediaPayload.filename = filename;
  } else if (mediaType === 'document') {
    mediaPayload.filename = 'document.pdf';
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: mediaTypes[mediaType],
    [mediaTypes[mediaType]]: mediaPayload
  };

  const event = {
    id: "out_" + Date.now(),
    type: mediaType,
    direction: "outgoing",
    from: to,
    body: displayCaption,
    msgType: mediaType,
    fileUrl: fileUrl || null,
    mediaUrl: fileUrl || null,
    mediaId: mediaId,
    displayTime: new Date().toLocaleString(),
    createdAt: new Date().toISOString()
  };
  allEvents.unshift(event);

  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

app.get("/api/stats", (req, res) => {
  const incoming = allEvents.filter(e => e.direction === "incoming");
  const outgoing = allEvents.filter(e => e.type === "message" && e.direction === "outgoing");
  const statuses = allEvents.filter(e => e.type === "status");

  res.json({
    totalEvents: allEvents.length,
    totalMessages: incoming.length + outgoing.length,
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
    uniqueUsers: sessions.size,
    sentStatus: statuses.filter(s => s.status === "sent").length,
    deliveredStatus: statuses.filter(s => s.status === "delivered").length,
    readStatus: statuses.filter(s => s.status === "read").length,
    failedStatus: statuses.filter(s => s.status === "failed").length
  });
});

app.get("/api/alldata", (req, res) => {
  const incoming = allEvents.filter(e => e.direction === "incoming");
  const outgoing = allEvents.filter(e => e.direction === "outgoing");
  const statuses = allEvents.filter(e => e.type === "status");
  const users = Array.from(sessions.entries()).map(([wa_id, data]) => ({ wa_id, ...data }));

  res.json({
    stats: {
      totalEvents: allEvents.length,
      totalMessages: incoming.length + outgoing.length,
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
      uniqueUsers: sessions.size,
      sentStatus: statuses.filter(s => s.status === "sent").length,
      deliveredStatus: statuses.filter(s => s.status === "delivered").length,
      readStatus: statuses.filter(s => s.status === "read").length,
      failedStatus: statuses.filter(s => s.status === "failed").length
    },
    events: allEvents,
    incoming,
    outgoing,
    statuses,
    users,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/messages", (req, res) => {
  res.json(allEvents.filter(e => e.type === "message"));
});

app.get("/api/incoming", (req, res) => {
  res.json(allEvents.filter(e => e.direction === "incoming"));
});

app.get("/api/outgoing", (req, res) => {
  res.json(allEvents.filter(e => e.type === "message" && e.direction === "outgoing"));
});

app.get("/api/status", (req, res) => {
  res.json(allEvents.filter(e => e.type === "status"));
});

app.get("/api/users", (req, res) => {
  const users = Array.from(sessions.entries()).map(([wa_id, data]) => ({ wa_id, ...data }));
  res.json(users);
});

app.post("/api/send", async (req, res) => {
  const { to, text } = req.body;
  
  if (!to || !text) {
    return res.status(400).json({ error: "Missing 'to' or 'text' parameter" });
  }

  try {
    await sendMessage(to, text);
    res.json({ success: true, to, text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/send", async (req, res) => {
  const { text, phone } = req.body;
  
  if (!text || !phone) {
    return res.status(400).json({ error: "Missing 'text' or 'phone' parameter" });
  }

  try {
    await sendMessage(phone, text);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/send/media", upload.single("file"), async (req, res) => {
  const { to, phone, type, caption, useUrl } = req.body;
  const file = req.file;
  const recipient = to || phone;
  
  if (!recipient || !type) {
    return res.status(400).json({ error: "Missing 'to/phone' or 'type' parameter" });
  }
  
  if (!file && !req.body.mediaUrl) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    let mediaId;
    let mediaUrl;

    if (useUrl === 'true' || !file) {
      mediaUrl = req.body.mediaUrl || `http://localhost:${PORT}/uploads/${file.filename}`;
      await sendMedia(recipient, type, mediaUrl, caption);
      res.json({ success: true, to: recipient, type, mediaUrl, caption, method: 'url' });
    } else {
      console.log('File saved at:', file.path);
      
      if (!fs.existsSync(file.path)) {
        throw new Error('File missing before upload: ' + file.path);
      }
      
      // Store local file URL for Flutter to access
      const localFileUrl = `http://localhost:${PORT}/uploads/${file.filename}`;
      
      mediaId = await uploadMediaToWhatsApp(file.path, file.mimetype);
      await sendMediaWithId(recipient, type, mediaId, caption, file.originalname, localFileUrl);
      res.json({ success: true, mediaId, to: recipient, type, caption, method: 'upload', fileUrl: localFileUrl });
    }
  } catch (error) {
    console.error('Error sending media:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/dashboard", (req, res) => {
  res.sendFile(__dirname + "/dashboard.html");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});