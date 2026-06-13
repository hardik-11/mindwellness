export default async function handler(req, res) {
  // Handle CORS preflight options
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
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
