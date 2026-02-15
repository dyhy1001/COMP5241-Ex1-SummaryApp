import { NextResponse } from "next/server";
import {
  getDocumentsTable,
  getSupabaseBucket,
  getSupabaseServerClient,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(req: Request) {
  const supabase = getSupabaseServerClient();
  const bucket = getSupabaseBucket();
  const url = new URL(req.url);
  const downloadPath = url.searchParams.get("download");

  if (downloadPath) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(downloadPath, 60);

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Failed to create signed URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: data.signedUrl });
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .list("uploads", {
      limit: 200,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const documentsTable = getDocumentsTable();
  const storagePaths = (data ?? []).map((item) => `uploads/${item.name}`);
  let documentsByPath = new Map<string, {
    document_name: string | null;
    summary_text: string | null;
    summary_updated_at: string | null;
  }>();

  if (storagePaths.length > 0) {
    const { data: documents, error: documentsError } = await supabase
      .from(documentsTable)
      .select("storage_path, document_name, summary_text, summary_updated_at")
      .in("storage_path", storagePaths);

    if (documentsError) {
      return NextResponse.json(
        { ok: false, error: documentsError.message },
        { status: 500 }
      );
    }

    documentsByPath = new Map(
      (documents ?? []).map((doc) => [
        doc.storage_path,
        {
          document_name: doc.document_name ?? null,
          summary_text: doc.summary_text ?? null,
          summary_updated_at: doc.summary_updated_at ?? null,
        },
      ])
    );
  }

  const items = (data ?? []).map((item) => ({
    name:
      documentsByPath.get(`uploads/${item.name}`)?.document_name ?? item.name,
    path: `uploads/${item.name}`,
    size: item.metadata?.size ?? null,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
    summary: documentsByPath.get(`uploads/${item.name}`)?.summary_text ?? null,
    summary_updated_at:
      documentsByPath.get(`uploads/${item.name}`)?.summary_updated_at ?? null,
  }));

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient();
  const bucket = getSupabaseBucket();
  const documentsTable = getDocumentsTable();
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Missing file upload." },
      { status: 400 }
    );
  }

  const safeName = sanitizeFileName(file.name || "document.pdf");
  const path = `uploads/${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const { error: dbError, data: documentRow } = await supabase
    .from(documentsTable)
    .insert({
      document_name: file.name || safeName,
      storage_path: path,
    })
    .select("id")
    .single();

  if (dbError) {
    return NextResponse.json(
      { ok: false, error: dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    path,
    documentId: documentRow?.id ?? null,
  });
}

export async function DELETE(req: Request) {
  const supabase = getSupabaseServerClient();
  const bucket = getSupabaseBucket();
  const documentsTable = getDocumentsTable();
  const body = await req.json();
  const path = body?.path;

  if (!path || typeof path !== "string") {
    return NextResponse.json(
      { ok: false, error: "Missing file path." },
      { status: 400 }
    );
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const { error: dbError } = await supabase
    .from(documentsTable)
    .delete()
    .eq("storage_path", path);

  if (dbError) {
    return NextResponse.json(
      { ok: false, error: dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
