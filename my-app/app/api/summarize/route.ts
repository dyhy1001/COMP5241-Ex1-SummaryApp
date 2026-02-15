import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import {
  getDocumentsTable,
  getSupabaseBucket,
  getSupabaseServerClient,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";

const MAX_CHARS = 12000;

export async function POST(req: Request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing GITHUB_TOKEN." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const path = body?.path;

  if (!path || typeof path !== "string") {
    return NextResponse.json(
      { ok: false, error: "Missing file path." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const bucket = getSupabaseBucket();
  const documentsTable = getDocumentsTable();

  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60);

  if (signedError || !signed) {
    return NextResponse.json(
      { ok: false, error: signedError?.message ?? "Failed to access file." },
      { status: 500 }
    );
  }

  const fileResponse = await fetch(signed.signedUrl);
  if (!fileResponse.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to download PDF." },
      { status: 500 }
    );
  }

  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  const pdfData = await pdf(buffer);
  const text = pdfData.text.replace(/\s+/g, " ").trim();

  if (!text) {
    return NextResponse.json(
      { ok: false, error: "No text could be extracted from the PDF." },
      { status: 422 }
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
              "You summarize PDF documents. Provide a concise summary in bullet points.",
          },
          {
            role: "user",
            content: `Summarize the following PDF text:\n\n${prompt}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
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
  const summary = aiData?.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    return NextResponse.json(
      { ok: false, error: "No summary returned from the AI." },
      { status: 500 }
    );
  }

  const summaryTimestamp = new Date().toISOString();
  const { data: updatedRows, error: updateError } = await supabase
    .from(documentsTable)
    .update({
      summary_text: summary,
      summary_updated_at: summaryTimestamp,
    })
    .eq("storage_path", path)
    .select("id");

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  if (!updatedRows || updatedRows.length === 0) {
    const documentName = path.split("/").pop() ?? "document.pdf";
    const { error: insertError } = await supabase
      .from(documentsTable)
      .insert({
        document_name: documentName,
        storage_path: path,
        summary_text: summary,
        summary_updated_at: summaryTimestamp,
      });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, summary });
}
