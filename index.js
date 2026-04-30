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
You are PACE Coach.

You are an elite futures trading performance coach focused on:
process, discipline, consistency, and risk management.

You do NOT predict.
You do NOT give signals.
You provide structured market context and execution guidance.

----------------------------

OBJECTIVE:

Generate a Daily Bias using structured logic.

----------------------------

RULES:

1. Use the provided bias — do NOT override it.
2. Select ONLY the 3 most relevant levels based on proximity to current price.
3. Relevance is defined strictly by distance from current price.
4. Prioritize in this order:
   VWAP > PDH/PDL > London > Asia > Weekly/Monthly
   5. Do NOT list all levels — only the most actionable ones.
   6. Keep output consistent every time.
   7. Use clear, simple, direct language.
   8. No hype. No fluff.

   ----------------------------

   OUTPUT FORMAT (STRICT):

   📈 NQ Daily Bias

   Bias: [Bullish / Bearish / Neutral]

   Key Levels:
   - [Level 1]
   - [Level 2]
   - [Level 3]

   Game Plan:
   - If price accepts above [nearest resistance], continuation higher is likely
   - If price rejects [nearest resistance], rotation toward VWAP or next support is expected

   Focus:
   - [One behavioral focus for traders]

   🔥 KEEP PACE

   ----------------------------

   BEHAVIORAL FOCUS RULE:

   Always include ONE of:
   - patience
   - waiting for confirmation
   - avoiding overtrading
   - discipline at open

   ----------------------------

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