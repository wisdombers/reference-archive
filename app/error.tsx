"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="form-wrap">
      <section className="form-panel">
        <div className="form-grid">
          <h1 className="page-title">화면을 불러오지 못했습니다</h1>
          <p className="muted">일시적인 오류가 발생했습니다. 다시 시도해주세요.</p>
          <button className="button primary" type="button" onClick={() => reset()}>
            다시 시도
          </button>
        </div>
      </section>
    </main>
  );
}
