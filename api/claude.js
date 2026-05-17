// api/claude.js
// Proxy seguro para a API do Google Gemini (gratuita).
// A GEMINI_API_KEY fica apenas nas variáveis de ambiente da Vercel.

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin",  process.env.ALLOWED_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
  }

  try {
    const { prompt, imageBase64, imageMime } = req.body;

    const parts = [];

    if (imageBase64 && imageMime) {
      parts.push({ inlineData: { mimeType: imageMime, data: imageBase64 } });
    }

    parts.push({ text: prompt });

    const geminiBody = {
      contents: [{ parts }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1000 },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await geminiRes.json();

    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data?.error?.message || "Erro na API Gemini" });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(502).json({ error: "Erro ao contactar a API Gemini.", detail: err.message });
  }
}
