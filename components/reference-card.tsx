"use client";

import { useEffect, useState } from "react";
import { Board, Reference } from "@/lib/database.types";
import { formatDate, normalizeTags } from "@/lib/references";

function fallbackImage(title: string) {
  return `https://placehold.co/800x500/e9f5f2/115e59/png?text=${encodeURIComponent(title.slice(0, 24) || "Reference")}`;
}

type ReferenceCardProps = {
  reference: Reference;
  boards: Board[];
  boardIds: string[];
  activeBoardId?: string;
  onToggleFavorite: (reference: Reference) => Promise<void>;
  onAddToBoard: (referenceId: string, boardId: string) => Promise<void>;
  onRemoveFromBoard: (referenceId: string, boardId: string) => Promise<void>;
  onCreateBoard: (name: string) => Promise<Board | null | undefined>;
};

export function ReferenceCard({
  reference,
  boards,
  boardIds,
  activeBoardId,
  onToggleFavorite,
  onAddToBoard,
  onRemoveFromBoard,
  onCreateBoard
}: ReferenceCardProps) {
  const image = reference.thumbnail_url || fallbackImage(reference.title);
  const tags = normalizeTags(reference.tags);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false);
  const [boardQuery, setBoardQuery] = useState("");
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const isFavorite = Boolean(reference.is_favorite);
  const filteredBoards = boards.filter((board) => board.name.toLowerCase().includes(boardQuery.trim().toLowerCase()));

  useEffect(() => {
    if (!actionMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActionMessage("");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  function closeSavePanel() {
    setIsSavePanelOpen(false);
    setActionMessage("");
    setActionError("");
  }

  async function runCardAction(action: () => Promise<void>) {
    setActionError("");
    setActionMessage("");
    setIsWorking(true);

    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setIsWorking(false);
    }
  }

  async function saveToBoard(board: Board) {
    await runCardAction(async () => {
      await onAddToBoard(reference.id, board.id);
      setActionMessage(`"${board.name}" 보드에 저장했습니다.`);
    });
  }

  async function removeFromBoard(board: Board) {
    await runCardAction(async () => {
      await onRemoveFromBoard(reference.id, board.id);
      setActionMessage(`"${board.name}" 보드에서 제거했습니다.`);
    });
  }

  async function createBoardAndSave() {
    const name = newBoardName.trim();

    if (!name) {
      setActionError("보드 이름을 입력해주세요.");
      return;
    }

    await runCardAction(async () => {
      const created = await onCreateBoard(name);

      if (!created) {
        throw new Error("보드를 만들지 못했습니다.");
      }

      await onAddToBoard(reference.id, created.id);
      setNewBoardName("");
      setIsCreatingBoard(false);
      setBoardQuery("");
      setActionMessage(`"${created.name}" 보드를 만들고 저장했습니다.`);
    });
  }

  return (
    <article className="card card-link">
      <div className="card-image-wrap">
        <a className="thumb-link" href={`/references/${reference.id}`} aria-label={`${reference.title} 보기`}>
          <div className="thumb-frame" style={imageRatio ? { aspectRatio: `${imageRatio}` } : undefined}>
            {imageFailed ? (
              <div className="thumb-fallback" aria-hidden="true">
                이미지 없음
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="thumb"
                src={image}
                alt=""
                loading="lazy"
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalWidth > 0 && naturalHeight > 0) {
                    setImageRatio(naturalWidth / naturalHeight);
                  }
                }}
                onError={() => setImageFailed(true)}
              />
            )}
          </div>
        </a>
        <button
          className={isFavorite ? "favorite-button active" : "favorite-button"}
          type="button"
          aria-label={isFavorite ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"}
          aria-pressed={isFavorite}
          disabled={isWorking}
          onClick={() => runCardAction(() => onToggleFavorite(reference))}
        >
          ★
        </button>
        <button className="save-button" type="button" onClick={() => setIsSavePanelOpen(true)}>
          저장
        </button>
      </div>
      <div className="card-body">
        <a href={`/references/${reference.id}`} aria-label={`${reference.title} 보기`}>
          <h2>{reference.title}</h2>
        </a>
        {reference.summary ? <p className="card-summary">{reference.summary}</p> : null}
        {reference.note ? <p className="card-note">{reference.note}</p> : null}
        {tags.length > 0 ? (
          <div className="tag-list">
            {tags.slice(0, 5).map((tag) => (
              <span className="tag-chip" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        {activeBoardId ? (
          <button className="text-action" type="button" disabled={isWorking} onClick={() => runCardAction(() => onRemoveFromBoard(reference.id, activeBoardId))}>
            현재 보드에서 제거
          </button>
        ) : null}
        {actionError ? <span className="error">{actionError}</span> : null}
        <p className="card-date">{formatDate(reference.created_at)}</p>
      </div>
      {isSavePanelOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeSavePanel}>
          <section className="save-modal" role="dialog" aria-modal="true" aria-label="보드에 저장" onMouseDown={(event) => event.stopPropagation()}>
            <div className="save-modal-header">
              <h3>보드에 저장</h3>
              <button className="modal-close" type="button" aria-label="닫기" onClick={closeSavePanel}>
                ×
              </button>
            </div>
            <input
              className="field"
              value={boardQuery}
              onChange={(event) => setBoardQuery(event.target.value)}
              placeholder="보드 검색"
            />
            <div className="save-board-section">
              <p className="save-section-title">모든 보드</p>
              {filteredBoards.length > 0 ? (
                <div className="save-board-list">
                  {filteredBoards.map((board) => {
                    const isSaved = boardIds.includes(board.id);

                    return (
                      <div className="save-board-row" key={board.id}>
                        <div className="board-placeholder" aria-hidden="true">
                          {board.name.slice(0, 1)}
                        </div>
                        <span>
                          {board.name}
                          {isSaved ? <em>추가됨</em> : null}
                        </span>
                        <button
                          className={isSaved ? "button compact" : "button compact primary"}
                          type="button"
                          disabled={isWorking}
                          onClick={() => (isSaved ? removeFromBoard(board) : saveToBoard(board))}
                        >
                          {isSaved ? "제거" : "추가"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted compact-copy">검색된 보드가 없습니다.</p>
              )}
            </div>
            <div className="save-create">
              {isCreatingBoard ? (
                <>
                  <input
                    className="field"
                    value={newBoardName}
                    onChange={(event) => setNewBoardName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        createBoardAndSave();
                      }
                      if (event.key === "Escape") {
                        setIsCreatingBoard(false);
                        setNewBoardName("");
                      }
                    }}
                    placeholder="새 보드 이름"
                    autoFocus
                  />
                  <button className="button primary" type="button" disabled={isWorking} onClick={createBoardAndSave}>
                    만들고 저장
                  </button>
                  <button className="button" type="button" onClick={() => setIsCreatingBoard(false)}>
                    취소
                  </button>
                </>
              ) : (
                <button className="create-board-button" type="button" onClick={() => setIsCreatingBoard(true)}>
                  + 보드 만들기
                </button>
              )}
            </div>
            {actionMessage ? <p className="success">{actionMessage}</p> : null}
            {actionError ? <p className="error">{actionError}</p> : null}
          </section>
        </div>
      ) : null}
    </article>
  );
}
