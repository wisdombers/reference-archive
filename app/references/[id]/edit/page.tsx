import { notFound, redirect } from "next/navigation";
import { ReferenceForm } from "@/components/reference-form";
import { createClient } from "@/lib/supabase-server";

export default async function EditReferencePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data } = await supabase.from("references").select("*").eq("id", params.id).single();

  if (!data) {
    notFound();
  }

  return (
    <main className="editor-wrap">
      <div className="topbar">
        <div>
          <h1 className="page-title">레퍼런스 편집</h1>
          <p className="muted">태그와 노트를 중심으로 필요한 맥락만 정리하세요.</p>
        </div>
      </div>
      <section className="editor-panel">
        <ReferenceForm reference={data} userId={user.id} />
      </section>
    </main>
  );
}
