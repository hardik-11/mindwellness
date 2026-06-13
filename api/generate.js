export default async function handler(req, res) {
  // Same-origin checking to block cross-origin hotlinking
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const isLocal =
        originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1";
      if (!isLocal && !host.includes(originUrl.hostname)) {
        return res.status(403).json({ error: "Access Denied: Cross-Origin Blocked" });
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid Origin Header" });
    }
  }

  // Handle CORS preflight options for same-origin
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY environment variable is not configured.",
    });
  }

  // Input payload structure validation to prevent arbitrary prompt injection
  const { contents, systemInstruction } = req.body || {};
  if (!contents || !Array.isArray(contents) || !systemInstruction) {
    return res.status(400).json({ error: "Invalid request payload format." });
  }

  const sysText = systemInstruction.parts?.[0]?.text || "";
  const allowedSystemInstructions = [
    "You are a professional wellness companion. Return ONLY valid JSON.",
    "You are MindEase, an empathetic mental wellness companion for Indian students.",
    "You are a meditation expert. Return ONLY valid JSON.",
    "You are a data analyst and psychologist. Return ONLY valid JSON.",
  ];

  const isValidSysPrompt = allowedSystemInstructions.some((prompt) =>
    sysText.includes(prompt)
  );

  if (!isValidSysPrompt) {
    return res.status(403).json({ error: "Access Denied: Unauthorized system prompt." });
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    "gemini-2.5-flash:generateContent?key=" +
    apiKey;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Vercel Proxy Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
