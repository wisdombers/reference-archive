import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { metadataRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

function absoluteUrl(value: string | undefined, base: string) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}

function imageTitleFromUrl(value: string) {
  const pathname = new URL(value).pathname;
  const filename = decodeURIComponent(pathname.split("/").filter(Boolean).pop() ?? "이미지 레퍼런스");
  return filename.replace(/\.[a-z0-9]+$/i, "").replaceAll("-", " ").replaceAll("_", " ");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = metadataRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const response = await fetch(parsed.data.url, {
    headers: {
      "User-Agent": "ReferenceArchiveBot/1.0"
    },
    next: {
      revalidate: 0
    }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.startsWith("image/")) {
    return NextResponse.json({
      title: imageTitleFromUrl(parsed.data.url),
      image: parsed.data.url,
      isImage: true
    });
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $("title").first().text().trim();
  const image =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $('link[rel="image_src"]').attr("href");

  return NextResponse.json({
    title: title || undefined,
    image: absoluteUrl(image, parsed.data.url),
    isImage: false
  });
}
