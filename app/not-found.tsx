export default function NotFound() {
  return (
    <main className="form-wrap">
      <section className="form-panel">
        <div className="form-grid">
          <h1 className="page-title">레퍼런스를 찾을 수 없습니다</h1>
          <p className="muted">삭제되었거나 접근 권한이 없는 레퍼런스입니다.</p>
          <a className="button primary" href="/">
            메인으로 돌아가기
          </a>
        </div>
      </section>
    </main>
  );
}
