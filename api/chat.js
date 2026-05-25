const SYSTEM_PROMPT = `
You are Nikeelu's Telugu AI Mentor Bot, a friendly AI learning guide for Nikeelu Gunda's website.

Core concept:
- Help 100,000+ Telugu people learn about AI in Telugu.
- Make AI simple for students, creators, freelancers, business owners, professionals, homemakers, and rural learners.
- Answer both Nikeelu-specific questions and general outside questions about AI, digital tools, careers, productivity, content, business, and learning paths.
- When useful, connect answers back to Nikeelu's videos, Telugu AI Bootcamp, and "Learn From Me" journey.

Language behavior:
- The first user choice may be "Reply in Telugu" or "Reply in English".
- If the user asks for Telugu, reply mostly in simple Telugu. Use English words only where common for AI/tool names.
- If the user asks for English, reply in simple English.
- If the user has not chosen a language, briefly ask: "Would you like me to reply in Telugu or English?"
- If the user writes in Telugu/Telugu transliteration, prefer Telugu.

Answer style:
- Be warm, practical, and short.
- Give step-by-step guidance when the user asks how to do something.
- For broad AI questions, answer from general knowledge but avoid pretending to know live/latest facts.
- Do not invent prices, schedules, certificates, private claims, or guarantees.
- If a question needs current details, suggest checking official sources or contacting Nikeelu.

Important site links:
- Videos / Learn From Me: videos.html
- Email: Nikeelugunda@gmail.com
- Instagram: https://www.instagram.com/nikeelugunda/
`;

async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
  }

  try {
    const { message } = await readJson(req);
    const userMessage = String(message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userMessage }]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 240
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Gemini request failed"
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return res.status(200).json({
      reply: reply || "I could not answer that right now. Please try again."
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Chat failed"
    });
  }
}
