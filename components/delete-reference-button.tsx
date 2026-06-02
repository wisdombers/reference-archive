"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export function DeleteReferenceButton({ id }: { id: string }) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm("이 레퍼런스를 삭제할까요?");

    if (!confirmed) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("references").delete().eq("id", id);

    if (error) {
      window.alert(error.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <button className="button danger" type="button" onClick={handleDelete}>
      삭제
    </button>
  );
}
