import { notFound } from "next/navigation";
import { DeleteReferenceButton } from "@/components/delete-reference-button";
import { formatDate, normalizeTags } from "@/lib/references";
import { createClient } from "@/lib/supabase-server";

function fallbackImage(title: string) {
  return `https://placehold.co/1000x620/e9f5f2/115e59/png?text=${encodeURIComponent(title.slice(0, 28) || "Reference")}`;
}

export default async function ReferenceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("references").select("*").eq("id", params.id).single();

  if (!data) {
    notFound();
  }

  const tags = normalizeTags(data.tags);

  return (
    <main className="detail-wrap">
      <div className="topbar">
        <a className="button" href="/">
          목록
        </a>
        <div className="actions">
          <a className="button" href={`/references/${data.id}/edit`}>
            편집
          </a>
          <DeleteReferenceButton id={data.id} />
        </div>
      </div>

      <article className="detail-panel">
        <a className="detail-image-link" href={data.source_url} target="_blank" rel="noreferrer" aria-label="원본 URL 새 탭에서 열기">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="detail-image" src={data.thumbnail_url || fallbackImage(data.title)} alt="" />
        </a>
        <div className="detail-heading">
          <h1 className="page-title">{data.title}</h1>
        </div>

        <section className="detail-meta">
          <div className="meta-item">
            <span>저장일</span>
            {formatDate(data.created_at)}
          </div>
          <div className="meta-item">
            <span>수정일</span>
            {formatDate(data.updated_at)}
          </div>
        </section>

        {data.summary ? (
          <section className="note-section">
            <h2>한 줄 메모</h2>
            <p className="summary-text">{data.summary}</p>
          </section>
        ) : null}

        {tags.length > 0 ? (
          <section className="note-section compact">
            <h2>태그</h2>
            <div className="tag-list">
              {tags.map((tag) => (
                <span className="tag-chip" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="note-section">
          <h2>상세 노트</h2>
          <p className="memo">{data.note || data.memo || "작성된 상세 노트가 없습니다."}</p>
        </section>
      </article>
    </main>
  );
}
