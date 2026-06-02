"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Reference } from "@/lib/database.types";
import { compressImageFile, IMAGE_COMPRESSION_ERROR, validateImageFile } from "@/lib/image-compression";
import { formDefaults, parseTags } from "@/lib/references";
import { createClient } from "@/lib/supabase-browser";
import { ReferenceFormValues, referenceSchema } from "@/lib/validation";

type ReferenceFormProps = {
  reference?: Reference;
  userId: string;
  initialBoardId?: string | null;
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function isLikelyImageUrl(value: string) {
  try {
    const url = new URL(value);
    return IMAGE_EXTENSIONS.some((extension) => url.pathname.toLowerCase().endsWith(`.${extension}`));
  } catch {
    return false;
  }
}

async function fetchMetadata(url: string) {
  const response = await fetch("/api/metadata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    throw new Error("metadata_failed");
  }

  return (await response.json()) as { title?: string; image?: string; isImage?: boolean };
}

export function ReferenceForm({ reference, userId, initialBoardId }: ReferenceFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");
  const [metadataMessage, setMetadataMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [compressedPreviewUrl, setCompressedPreviewUrl] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const compressedPreviewRef = useRef<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ReferenceFormValues>({
    resolver: zodResolver(referenceSchema),
    defaultValues: formDefaults(reference)
  });

  const metadataMutation = useMutation({
    mutationFn: fetchMetadata,
    onSuccess(data) {
      setMetadataMessage("");
      if (data.title) {
        setValue("title", data.title, { shouldValidate: true });
      }
      if (data.image) {
        setValue("thumbnail_url", data.image, { shouldValidate: true });
      }
      setMetadataMessage(data.isImage ? "이미지 URL을 카드 이미지로 설정했습니다." : "URL 정보를 가져왔습니다.");
    },
    onError() {
      setMetadataMessage("URL 정보를 가져오지 못했습니다. 제목은 직접 입력할 수 있습니다.");
    }
  });

  useEffect(() => {
    return () => {
      if (compressedPreviewRef.current) {
        URL.revokeObjectURL(compressedPreviewRef.current);
      }
    };
  }, []);

  function updateCompressedPreview(url: string) {
    if (compressedPreviewRef.current) {
      URL.revokeObjectURL(compressedPreviewRef.current);
    }

    compressedPreviewRef.current = url;
    setCompressedPreviewUrl(url);
  }

  async function handleThumbnailUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadMessage("");
    setUploadError("");

    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);

    try {
      const compressedFile = await compressImageFile(file);
      updateCompressedPreview(URL.createObjectURL(compressedFile));

      const formData = new FormData();
      formData.append("file", compressedFile);
      const response = await fetch("/api/upload-thumbnail", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { publicUrl?: string; error?: string };

      if (!response.ok || !data.publicUrl) {
        throw new Error(data.error || "이미지 업로드에 실패했습니다.");
      }

      setValue("thumbnail_url", data.publicUrl, { shouldDirty: true, shouldValidate: true });
      setUploadMessage("이미지를 압축한 뒤 카드 이미지로 설정했습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : IMAGE_COMPRESSION_ERROR;
      setUploadError(message === "image_load_failed" || message === "canvas_to_blob_failed" ? IMAGE_COMPRESSION_ERROR : message);
    } finally {
      setIsUploading(false);
    }
  }

  function addTag() {
    const nextTag = tagDraft.trim().replace(/^#/, "");
    if (!nextTag) {
      return;
    }

    const nextTags = Array.from(new Set([...parseTags(watch("tags")), nextTag])).slice(0, 20);
    setValue("tags", nextTags.join(", "), { shouldDirty: true, shouldValidate: true });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    const nextTags = parseTags(watch("tags")).filter((item) => item !== tag);
    setValue("tags", nextTags.join(", "), { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: ReferenceFormValues) {
    setFormError("");
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const currentUserId = user?.id ?? userId;
    const fallbackThumbnail = !values.thumbnail_url && isLikelyImageUrl(values.source_url) ? values.source_url : values.thumbnail_url;
    const payload = {
      title: values.title,
      source_url: values.source_url,
      thumbnail_url: fallbackThumbnail || null,
      summary: values.summary || null,
      tags: parseTags(values.tags),
      note: values.note || null,
      user_id: currentUserId
    };

    if (reference) {
      const { error } = await supabase.from("references").update(payload).eq("id", reference.id);
      if (error) {
        setFormError(error.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["references"] });
      router.push(`/references/${reference.id}`);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.from("references").insert(payload).select("id").single();
    if (error) {
      setFormError(error.message);
      return;
    }

    if (initialBoardId) {
      const { error: boardError } = await supabase.from("reference_boards").insert({
        reference_id: data.id,
        board_id: initialBoardId
      });

      if (boardError && boardError.code !== "23505") {
        setFormError(boardError.message);
        return;
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["references"] });
    await queryClient.invalidateQueries({ queryKey: ["reference_boards"] });
    router.push(`/references/${data.id}`);
    router.refresh();
  }

  const sourceUrl = watch("source_url");
  const previewUrl = compressedPreviewUrl || watch("thumbnail_url") || (isLikelyImageUrl(sourceUrl) ? sourceUrl : "");
  const previewTitle = watch("title");
  const previewSummary = watch("summary");
  const tagsValue = watch("tags");
  const selectedTags = useMemo(() => new Set(parseTags(tagsValue)), [tagsValue]);

  return (
    <form className="reference-editor" onSubmit={handleSubmit(onSubmit)}>
      <aside className="preview-pane" aria-label="이미지 미리보기">
        <div className="preview-frame">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" />
          ) : (
            <div className="preview-empty">이미지 미리보기</div>
          )}
        </div>
        <div className="preview-copy">
          <p>{previewTitle || "제목이 여기에 표시됩니다"}</p>
          <span>{previewSummary || "한 줄 메모를 보며 노트를 정리해보세요."}</span>
        </div>
      </aside>

      <div className="form-grid">
        <label className="label">
          레퍼런스 URL
          <input className="field" type="url" placeholder="웹페이지, 이미지, 영상 URL" {...register("source_url")} />
          {errors.source_url ? <span className="error">{errors.source_url.message}</span> : null}
        </label>
        <input type="hidden" {...register("thumbnail_url")} />

        <button
          className="button"
          type="button"
          disabled={!sourceUrl || metadataMutation.isPending}
          onClick={() => metadataMutation.mutate(sourceUrl)}
        >
          {metadataMutation.isPending ? "가져오는 중" : "URL 정보 자동 가져오기"}
        </button>
        {metadataMessage ? <span className={metadataMutation.isError ? "error" : "success"}>{metadataMessage}</span> : null}

        <label className="label">
          제목
          <input className="field" placeholder="레퍼런스 제목" {...register("title")} />
          {errors.title ? <span className="error">{errors.title.message}</span> : null}
        </label>

        <label className="label">
          이미지 파일 업로드
          <input className="field file-field" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailUpload} disabled={isUploading} />
          {uploadError ? <span className="error">{uploadError}</span> : null}
          {uploadMessage ? <span className="success">{uploadMessage}</span> : null}
        </label>

        <label className="label">
          한 줄 메모
          <input className="field" placeholder="무엇이 좋은 레퍼런스인지 짧게 적어보세요." {...register("summary")} />
          {errors.summary ? <span className="error">{errors.summary.message}</span> : null}
        </label>

        <div className="label">
          태그
          <input type="hidden" {...register("tags")} />
          <div className="tag-input-row">
            <input
              className="field"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="새 태그 추가"
            />
            <button className="button" type="button" onClick={addTag}>
              추가
            </button>
          </div>
          <div className="tag-picker" aria-label="선택된 태그">
            {Array.from(selectedTags).map((item) => (
              <button className="tag-option active" type="button" key={item} onClick={() => removeTag(item)} aria-label={`${item} 태그 삭제`}>
                #{item} ×
              </button>
            ))}
          </div>
          {errors.tags ? <span className="error">{errors.tags.message}</span> : null}
        </div>

        <label className="label">
          상세 노트
          <textarea className="textarea large" placeholder="좋았던 이유, 활용 아이디어, 참고할 장면을 자유롭게 남겨보세요." {...register("note")} />
          {errors.note ? <span className="error">{errors.note.message}</span> : null}
        </label>

        <div className="actions">
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "저장 중" : "저장"}
          </button>
          <button className="button" type="button" onClick={() => router.back()}>
            취소
          </button>
        </div>
        {formError ? <p className="error">{formError}</p> : null}
      </div>
    </form>
  );
}
