import { redirect } from "next/navigation";
import { ReferenceForm } from "@/components/reference-form";
import { createClient } from "@/lib/supabase-server";

export default async function NewReferencePage({ searchParams }: { searchParams?: { board?: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="editor-wrap">
      <div className="topbar">
        <div>
          <h1 className="page-title">레퍼런스 추가</h1>
          <p className="muted">이미지를 업로드하고 나만의 인사이트를 기록해보세요.</p>
        </div>
        <a className="button" href="/">
          목록
        </a>
      </div>
      <section className="editor-panel">
        <ReferenceForm userId={user.id} initialBoardId={searchParams?.board ?? null} />
      </section>
    </main>
  );
}
