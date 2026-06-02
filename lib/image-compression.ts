const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_ORIGINAL_IMAGE_BYTES = 5 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;

export const IMAGE_TYPE_ERROR = "JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.";
export const IMAGE_SIZE_ERROR = "이미지 용량은 5MB 이하로 업로드해주세요.";
export const IMAGE_COMPRESSION_ERROR = "이미지 압축에 실패했습니다. 다른 이미지를 선택해주세요.";

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function validateImageFile(file: File) {
  const extension = getFileExtension(file);

  if (!ALLOWED_IMAGE_TYPES.has(file.type) && !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return IMAGE_TYPE_ERROR;
  }

  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    return IMAGE_SIZE_ERROR;
  }

  return "";
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image_load_failed"));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("canvas_to_blob_failed"));
      },
      type,
      quality
    );
  });
}

function compressedFileName(file: File, extension: "webp" | "jpg") {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "reference-image";
  return `${baseName}.${extension}`;
}

export async function compressImageFile(file: File) {
  const validationError = validateImageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(IMAGE_COMPRESSION_ERROR);
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const attempts = [
    { type: "image/webp", extension: "webp" as const, quality: 0.82 },
    { type: "image/webp", extension: "webp" as const, quality: 0.75 },
    { type: "image/webp", extension: "webp" as const, quality: 0.68 },
    { type: "image/jpeg", extension: "jpg" as const, quality: 0.8 }
  ];

  let bestFile: File | null = null;

  for (const attempt of attempts) {
    const blob = await canvasToBlob(canvas, attempt.type, attempt.quality);
    const compressed = new File([blob], compressedFileName(file, attempt.extension), { type: attempt.type });

    if (!bestFile || compressed.size < bestFile.size) {
      bestFile = compressed;
    }

    if (compressed.size <= TARGET_IMAGE_BYTES) {
      return compressed;
    }
  }

  if (!bestFile) {
    throw new Error(IMAGE_COMPRESSION_ERROR);
  }

  return bestFile;
}
