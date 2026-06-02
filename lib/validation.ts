import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => !value || z.string().url().safeParse(value).success, "올바른 이미지 URL을 입력해주세요.");

export const referenceSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(160, "제목은 160자 이하로 입력해주세요."),
  source_url: z.string().trim().url("올바른 URL을 입력해주세요."),
  thumbnail_url: optionalUrl,
  summary: z.string().trim().max(180, "한 줄 메모는 180자 이하로 입력해주세요."),
  tags: z.string().trim().max(300, "태그는 300자 이하로 입력해주세요."),
  note: z.string().trim().max(5000, "상세 노트는 5000자 이하로 입력해주세요.")
});

export type ReferenceFormValues = z.infer<typeof referenceSchema>;

export const metadataRequestSchema = z.object({
  url: z.string().trim().url("올바른 URL을 입력해주세요.")
});
