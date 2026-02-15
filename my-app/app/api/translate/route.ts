import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_CHARS = 6000;

export async function POST(req: Request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing GITHUB_TOKEN." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const text = body?.text;
  const targetLanguage = body?.targetLanguage;
  const targetLanguages = body?.targetLanguages;

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { ok: false, error: "Missing text to translate." },
      { status: 400 }
    );
  }

  const languageList = Array.isArray(targetLanguages)
    ? targetLanguages.filter((lang) => typeof lang === "string")
    : typeof targetLanguage === "string"
      ? [targetLanguage]
      : [];

  if (languageList.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing target language." },
      { status: 400 }
    );
  }

  const prompt = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  const aiResponse = await fetch(
    "https://models.inference.ai.azure.com/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "api-key": token,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a translator. Translate accurately and keep the original formatting. Return JSON only.",
          },
          {
            role: "user",
            content:
              `Translate the following text into these languages: ${languageList.join(
                ", "
              )}.\nReturn a JSON object where each key is the language name and each value is the translation.\n\nText:\n${prompt}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 700,
      }),
    }
  );

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    return NextResponse.json(
      {
        ok: false,
        error: `AI request failed: ${aiResponse.status} ${errorText}`,
      },
      { status: 500 }
    );
  }

  const aiData = await aiResponse.json();
  const content = aiData?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json(
      { ok: false, error: "No translation returned from the AI." },
      { status: 500 }
    );
  }

  let translations: Record<string, string> | null = null;
  try {
    translations = JSON.parse(content);
  } catch {
    translations = null;
  }

  if (!translations || Object.keys(translations).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Translation output was not valid JSON." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, translations });
}
