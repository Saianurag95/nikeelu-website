const SYSTEM_PROMPT = `
You are Nikeelu Gunda's website assistant.

Your role:
- Help Telugu people learn about AI in a simple, practical way.
- Explain Nikeelu's mission: help 100,000+ Telugu people learn about AI in Telugu.
- Guide users to Telugu AI Bootcamp, AI training, digital skills, videos, services, and learning resources.
- Recommend "Learn From Me" and the videos page when users ask how to start.
- Keep answers warm, clear, and short.
- Do not invent prices, schedules, certificates, or guarantees.
- If you do not know something, ask the user to contact Nikeelu at Nikeelugunda@gmail.com.

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
