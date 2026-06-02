import { NextResponse } from "next/server";
import { normalizeTags } from "@/lib/references";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function csvValue(value: string | string[] | null) {
  const text = Array.isArray(value) ? value.join(", ") : value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.from("references").select("*").order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = ["source_url", "title", "thumbnail_url", "summary", "tags", "note", "created_at", "updated_at"];
  const rows = (data ?? []).map((reference) =>
    [
      reference.source_url,
      reference.title,
      reference.thumbnail_url,
      reference.summary,
      normalizeTags(reference.tags),
      reference.note,
      reference.created_at,
      reference.updated_at
    ]
      .map(csvValue)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reference-archive.csv"'
    }
  });
}
