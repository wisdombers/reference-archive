import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const THUMBNAIL_BUCKET = "reference-thumbnails";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function getExtension(file: File) {
  const mimeExtension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/jpeg" ? "jpg" : "";
  const nameExtension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return mimeExtension || (IMAGE_EXTENSIONS.has(nameExtension) ? nameExtension : "");
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 이미지 파일을 찾지 못했습니다." }, { status: 400 });
  }

  const extension = getExtension(file);
  const isAllowedType = IMAGE_TYPES.has(file.type) || IMAGE_EXTENSIONS.has(extension);

  if (!isAllowedType) {
    return NextResponse.json({ error: "JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const path = `${user.id}/${id}.${extension === "jpeg" ? "jpg" : extension}`;
  const { error } = await supabase.storage.from(THUMBNAIL_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || `image/${extension === "jpg" ? "jpeg" : extension}`,
    upsert: false
  });

  if (error) {
    const message =
      error.message.includes("Bucket not found") || error.message.includes("bucket")
        ? "이미지 업로드 저장소가 아직 준비되지 않았습니다. Supabase Storage bucket(reference-thumbnails)을 확인해주세요."
        : error.message;

    return NextResponse.json({ error: message }, { status: 400 });
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path);

  return NextResponse.json({ publicUrl });
}
