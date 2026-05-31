// WORKING

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/images", express.static("images")); // For show icons

/* ===============================
   Gemini Setup
================================ */

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env file");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Use exact model from AI Studio
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  // model: "gemini-1.5-flash",
});

/* ===============================
   Chat Route
================================ */

app.post("/chat", async (req, res) => {
  try {
    if (!req.body.message) {
      return res.status(400).json({ reply: "Message is required" });
    }

    const result = await model.generateContent(req.body.message);
    const response = result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({
      reply: "API error occurred",
      error: error.message,
    });
  }
});

/* ===============================
   Server Start
================================ */

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});