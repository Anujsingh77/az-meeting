import { NextRequest, NextResponse } from "next/server";

const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { text, from, to } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ translated: text });
    }
    if (from === to) {
      return NextResponse.json({ translated: text });
    }

    // Use Google Cloud Translation if key present
    if (GOOGLE_KEY) {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: from, target: to, format: "text" }),
      });
      const data = await res.json();
      const translated = data?.data?.translations?.[0]?.translatedText ?? text;
      return NextResponse.json({ translated });
    }

    // Fallback: mock translation (replace with your preferred engine)
    return NextResponse.json({
      translated: `[${to.toUpperCase()}] ${text}`,
      mock: true,
    });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ translated: "", error: "Translation failed" }, { status: 500 });
  }
}
