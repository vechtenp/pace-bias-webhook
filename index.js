const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DISCORD_WEBHOOK_URL) {
  console.error("Missing DISCORD_WEBHOOK_URL in .env");
}

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env");
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("PACE Bias Webhook Running");
});

async function generateBiasNarrative(data) {
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: `
You are PACE Coach, a professional futures trading coach.

Create a clean NQ Daily Bias post from this TradingView alert data.

Use this exact format:

📈 **NQ Daily Bias**

Bias: [Bullish / Bearish / Neutral]

Key Levels:
- [level]
- [level]
- [level]

Game Plan:
- [scenario 1]
- [scenario 2]

Focus:
- [one clear thing to watch]

🔥 **KEEP PACE**

Rules:
- Keep it short and clean.
- Do not give trade signals.
- Do not say buy or sell.
- Use scenario-based language only.
- Prioritize nearby/relevant levels.
- Do not include every level unless useful.
- Use the supplied bias.
- Mention acceptance/rejection where appropriate.

TradingView Data:
${JSON.stringify(data, null, 2)}
    `.trim(),
    max_output_tokens: 350
  });

  return response.output_text || "No bias returned.";
}

app.post("/tradingview", async (req, res) => {
  try {
    console.log("TradingView alert received:", req.body);

    const data = req.body;

    const biasPost = await generateBiasNarrative(data);

    await axios.post(DISCORD_WEBHOOK_URL, {
      content: biasPost
    });

    console.log("Bias posted to Discord.");
    res.status(200).send("Posted");

  } catch (err) {
    console.error("TradingView webhook error:");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error(err.message);
    }

    res.status(500).send("Error");
  }
});

app.listen(PORT, () => {
  console.log(`PACE Bias running on ${PORT}`);
});