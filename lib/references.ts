import { Reference } from "@/lib/database.types";
import { ReferenceFormValues } from "@/lib/validation";

export type ReferenceSort = "latest" | "oldest";

function compareTextStable(a: string, b: string) {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function sortReferences(references: Reference[], sort: ReferenceSort) {
  return [...references].sort((a, b) => {
    const first = new Date(a.created_at).getTime();
    const second = new Date(b.created_at).getTime();

    if (first !== second) {
      return sort === "oldest" ? first - second : second - first;
    }

    return compareTextStable(a.id, b.id);
  });
}

export function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

export function normalizeTags(tags: unknown) {
  if (Array.isArray(tags)) {
    return Array.from(new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))).sort(compareTextStable);
  }

  if (typeof tags === "string") {
    return parseTags(tags).sort(compareTextStable);
  }

  return [];
}

export function formatTags(tags: unknown) {
  return normalizeTags(tags).join(", ");
}

export function filterReferences(references: Reference[], query: string, tag: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTag = tag.trim().replace(/^#/, "").toLowerCase();

  return references.filter((reference) => {
    const tags = normalizeTags(reference.tags);
    const searchable = [reference.title, reference.source_url, reference.summary ?? "", reference.note ?? "", ...tags].join(" ").toLowerCase();
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesTag = !normalizedTag || tags.some((item) => item.toLowerCase() === normalizedTag);

    return matchesQuery && matchesTag;
  });
}

export function formDefaults(reference?: Reference): ReferenceFormValues {
  return {
    title: reference?.title ?? "",
    source_url: reference?.source_url ?? "",
    thumbnail_url: reference?.thumbnail_url ?? "",
    summary: reference?.summary ?? "",
    tags: formatTags(reference?.tags),
    note: reference?.note ?? reference?.memo ?? ""
  };
}

export function getHostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function formatDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "numeric"
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return value;
  }

  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}
