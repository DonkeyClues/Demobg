// Minimal Express proxy to forward uploads to remove.bg (recommended).
// Keeps your API key on the server and avoids exposing it to clients.
// Usage:
// 1. npm init -y
// 2. npm i express multer node-fetch form-data dotenv
// 3. Create a .env file with REMOVE_BG_API_KEY=your_key
// 4. node server.js
//
// The client can then POST files to /remove-bg and receive the PNG in response.

import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

if (!REMOVE_BG_API_KEY) {
  console.error("Set REMOVE_BG_API_KEY in .env");
  process.exit(1);
}

app.post("/remove-bg", upload.single("image_file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded (use field name 'image_file').");

    const form = new FormData();
    form.append("size", "auto");
    form.append("image_file", req.file.buffer, { filename: req.file.originalname || "file.jpg" });

    const resp = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": REMOVE_BG_API_KEY,
        // form.getHeaders() contains proper multipart headers:
        ...form.getHeaders()
      },
      body: form
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).send(text || resp.statusText);
    }

    // Stream PNG back to client
    res.setHeader("Content-Type", "image/png");
    const buffer = await resp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});