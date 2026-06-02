"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Board, Reference, ReferenceBoard } from "@/lib/database.types";
import { createClient } from "@/lib/supabase-browser";
import { filterReferences, normalizeTags, sortReferences } from "@/lib/references";
import { useArchiveStore } from "@/store/archive-store";
import { ReferenceCard } from "@/components/reference-card";
import { LoginForm } from "@/components/login-form";
import { SignOutButton } from "@/components/sign-out-button";

async function fetchReferences() {
  const supabase = createClient();
  const { data, error } = await supabase.from("references").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchBoards() {
  const supabase = createClient();
  const { data, error } = await supabase.from("boards").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchReferenceBoards() {
  const supabase = createClient();
  const { data, error } = await supabase.from("reference_boards").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

type BoardFilter = "all" | "favorites" | string;

type DashboardProps = {
  initialReferences: Reference[];
  initialBoards: Board[];
  initialReferenceBoards: ReferenceBoard[];
  userEmail: string | null;
  userId: string | null;
};

export function Dashboard({ initialReferences, initialBoards, initialReferenceBoards, userEmail, userId }: DashboardProps) {
  const { query, tag, sort, setQuery, setTag, setSort } = useArchiveStore();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [activeBoard, setActiveBoard] = useState<BoardFilter>("all");
  const [boardError, setBoardError] = useState("");
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [isBoardEditOpen, setIsBoardEditOpen] = useState(false);
  const [boardEditName, setBoardEditName] = useState("");
  const [boardEditDescription, setBoardEditDescription] = useState("");
  const isSignedIn = Boolean(userEmail);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: queryData, isLoading, error } = useQuery({
    queryKey: ["references", userEmail],
    queryFn: fetchReferences,
    initialData: initialReferences,
    enabled: mounted && isSignedIn
  });

  const { data: boardData } = useQuery({
    queryKey: ["boards", userEmail],
    queryFn: fetchBoards,
    initialData: initialBoards,
    enabled: mounted && isSignedIn
  });

  const { data: referenceBoardData } = useQuery({
    queryKey: ["reference_boards", userEmail],
    queryFn: fetchReferenceBoards,
    initialData: initialReferenceBoards,
    enabled: mounted && isSignedIn
  });

  const data = mounted ? queryData ?? initialReferences : initialReferences;
  const boards = mounted ? boardData ?? initialBoards : initialBoards;
  const referenceBoards = mounted ? referenceBoardData ?? initialReferenceBoards : initialReferenceBoards;
  const effectiveQuery = mounted ? query : "";
  const effectiveTag = mounted ? tag : "";
  const effectiveSort = mounted ? sort : "latest";
  const effectiveBoard = mounted ? activeBoard : "all";

  const boardReferenceIds = useMemo(() => {
    const map = new Map<string, Set<string>>();

    referenceBoards.forEach((item) => {
      const items = map.get(item.board_id) ?? new Set<string>();
      items.add(item.reference_id);
      map.set(item.board_id, items);
    });

    return map;
  }, [referenceBoards]);

  const referenceBoardIds = useMemo(() => {
    const map = new Map<string, string[]>();

    referenceBoards.forEach((item) => {
      map.set(item.reference_id, [...(map.get(item.reference_id) ?? []), item.board_id]);
    });

    return map;
  }, [referenceBoards]);

  const references = useMemo(() => {
    const boardFiltered = data.filter((reference) => {
      if (effectiveBoard === "all") {
        return true;
      }

      if (effectiveBoard === "favorites") {
        return Boolean(reference.is_favorite);
      }

      return boardReferenceIds.get(effectiveBoard)?.has(reference.id) ?? false;
    });

    return sortReferences(filterReferences(boardFiltered, effectiveQuery, effectiveTag), effectiveSort);
  }, [boardReferenceIds, data, effectiveBoard, effectiveQuery, effectiveSort, effectiveTag]);

  const tagOptions = useMemo(() => {
    const storedTags = data.flatMap((reference) => normalizeTags(reference.tags));

    return Array.from(new Set(storedTags)).sort((a, b) => (a === b ? 0 : a < b ? -1 : 1));
  }, [data]);

  const activeUserBoard = boards.find((board) => board.id === effectiveBoard);
  const newReferenceHref = activeUserBoard ? `/references/new?board=${activeUserBoard.id}` : "/references/new";
  const activeBoardCount = activeUserBoard ? boardReferenceIds.get(activeUserBoard.id)?.size ?? 0 : 0;

  async function invalidateArchive() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["references"] }),
      queryClient.invalidateQueries({ queryKey: ["boards"] }),
      queryClient.invalidateQueries({ queryKey: ["reference_boards"] })
    ]);
  }

  async function createBoardWithName(nameValue: string) {
    const name = nameValue.trim();
    if (!name) {
      throw new Error("보드 이름을 입력해주세요.");
    }

    const supabase = createClient();
    const { data: created, error: createError } = await supabase.from("boards").insert({ name }).select("*").single();

    if (createError) {
      throw createError;
    }

    await invalidateArchive();
    return created;
  }

  function openBoardEdit(board: Board) {
    setBoardError("");
    setIsBoardMenuOpen(false);
    setBoardEditName(board.name);
    setBoardEditDescription(board.description ?? "");
    setIsBoardEditOpen(true);
  }

  async function updateBoardDetails() {
    if (!activeUserBoard) {
      return;
    }

    const name = boardEditName.trim();

    if (!name) {
      setBoardError("보드 이름을 입력해주세요.");
      return;
    }

    setBoardError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("boards")
      .update({ name, description: boardEditDescription.trim() || null })
      .eq("id", activeUserBoard.id);

    if (updateError) {
      setBoardError(updateError.message);
      return;
    }

    setIsBoardEditOpen(false);
    setBoardEditName("");
    setBoardEditDescription("");
    await invalidateArchive();
  }

  async function deleteBoard(boardId: string) {
    const board = boards.find((item) => item.id === boardId);

    if (!board || !window.confirm(`"${board.name}" 보드를 삭제할까요? 레퍼런스는 삭제되지 않습니다.`)) {
      return;
    }

    setBoardError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("boards").delete().eq("id", boardId);

    if (deleteError) {
      setBoardError(deleteError.message);
      return;
    }

    if (activeBoard === boardId) {
      setActiveBoard("all");
    }

    setIsBoardMenuOpen(false);
    await invalidateArchive();
  }

  async function toggleFavorite(reference: Reference) {
    const supabase = createClient();
    const { error: favoriteError } = await supabase.from("references").update({ is_favorite: !Boolean(reference.is_favorite) }).eq("id", reference.id);

    if (!favoriteError) {
      await queryClient.invalidateQueries({ queryKey: ["references"] });
    }
  }

  async function addReferenceToBoard(referenceId: string, boardId: string) {
    if (!boardId) {
      return;
    }

    const supabase = createClient();
    const { error: addError } = await supabase.from("reference_boards").insert({ reference_id: referenceId, board_id: boardId });

    if (addError && addError.code !== "23505") {
      throw addError;
    }

    await queryClient.invalidateQueries({ queryKey: ["reference_boards"] });
  }

  async function removeReferenceFromBoard(referenceId: string, boardId: string) {
    const supabase = createClient();
    await supabase.from("reference_boards").delete().eq("reference_id", referenceId).eq("board_id", boardId);
    await queryClient.invalidateQueries({ queryKey: ["reference_boards"] });
  }

  return (
    <main className={isSignedIn ? "shell" : "shell landing-shell"}>
      {!isSignedIn ? (
        <section className="landing-board editorial-landing" id="login">
          <nav className="landing-nav" aria-label="The Archive Room">
            <a href="#login" className="landing-brand">
              THE ARCHIVE ROOM
            </a>
            <div className="landing-menu" aria-hidden="true">
              <span>VISUAL INDEX</span>
              <span>NOTES</span>
              <span>BOARDS</span>
              <span>PRIVATE ROOM</span>
            </div>
          </nav>

          <div className="landing-grid">
            <div className="landing-copy">
              <p className="eyebrow">Private visual archive</p>
              <h1>
                <span>THE</span>
                <span>ARCHIVE</span>
                <span>ROOM</span>
              </h1>
              <p className="landing-lines">
                Collect references.
                <br />
                Arrange ideas.
                <br />
                Revisit your notes.
              </p>
              <p className="landing-korean">이미지, 카피, 캠페인 무드를 모아 나만의 시선으로 다시 꺼내보는 개인 아카이브</p>
            </div>

            <div className="hero-collage" aria-hidden="true">
              <div className="visual-frame visual-frame-main">
                <span>ARCHIVE 001</span>
              </div>
              <div className="visual-frame visual-frame-note">
                <span>VISUAL NOTE</span>
              </div>
              <div className="archive-object">
                <p>Save now</p>
                <p>Find later</p>
              </div>
              <p className="vertical-label">CURATED ROOM / PRIVATE INDEX</p>
            </div>

            <div className="auth-card">
              <div className="login-heading">
                <p className="eyebrow">Enter the room</p>
                <h2>Start your archive</h2>
              </div>
              <LoginForm />
            </div>
          </div>

          <footer className="landing-meta" aria-hidden="true">
            <span>ARCHIVE / NOTE / BOARD / BUILD / DREAM / HOME</span>
            <span>PRIVATE VISUAL INDEX</span>
            <span>2026 EDITION</span>
          </footer>
        </section>
      ) : (
        <header className="topbar archive-header">
          <div className="brand">
            <p className="eyebrow">Personal archive</p>
            <h1>The Archive Room</h1>
            <p className="hero-kicker">영감이 쌓이는 나만의 개인 아카이브</p>
            <p className="session-label">현재 로그인: {userEmail}</p>
          </div>
          <div className="actions">
            <a className="button" href="/api/export">
              CSV 내보내기
            </a>
            <a className="button primary" href={newReferenceHref}>
              레퍼런스 추가
            </a>
            <SignOutButton />
          </div>
        </header>
      )}

      {isSignedIn ? (
        <>
          <section className="toolbar" aria-label="검색 및 필터">
            <input
              className="field"
              value={effectiveQuery}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, URL, 메모, 노트 검색"
            />
            <select className="select" value={effectiveTag} onChange={(event) => setTag(event.target.value)} aria-label="태그 필터">
              <option value="">모든 태그</option>
              {tagOptions.map((item) => (
                <option key={item} value={item}>
                  #{item}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={effectiveSort}
              onChange={(event) => setSort(event.target.value === "oldest" ? "oldest" : "latest")}
              aria-label="정렬"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          </section>

          <section className="board-filter" aria-label="보드">
            <button className={effectiveBoard === "all" ? "board-chip active" : "board-chip"} type="button" onClick={() => setActiveBoard("all")}>
              전체 보기
            </button>
            <button
              className={effectiveBoard === "favorites" ? "board-chip active" : "board-chip"}
              type="button"
              onClick={() => setActiveBoard("favorites")}
            >
              즐겨찾기
            </button>
            {boards.map((board) => (
              <button
                className={effectiveBoard === board.id ? "board-chip active" : "board-chip"}
                type="button"
                key={board.id}
                onClick={() => {
                  setActiveBoard(board.id);
                  setIsBoardMenuOpen(false);
                }}
              >
                {board.name}
              </button>
            ))}
          </section>
          {boardError ? <p className="error board-error">{boardError}</p> : null}

          {activeUserBoard ? (
            <section className="board-detail-head" aria-label={`${activeUserBoard.name} 보드 정보`}>
              <div>
                <p className="eyebrow">Board</p>
                <h2>{activeUserBoard.name}</h2>
                {activeUserBoard.description ? <p className="board-description">{activeUserBoard.description}</p> : null}
                <p className="board-count">{activeBoardCount}개의 레퍼런스</p>
              </div>
              <div className="board-options">
                <button
                  className="dots-button"
                  type="button"
                  aria-label={`${activeUserBoard.name} 보드 옵션`}
                  aria-expanded={isBoardMenuOpen}
                  onClick={() => setIsBoardMenuOpen((value) => !value)}
                >
                  ⋯
                </button>
                {isBoardMenuOpen ? (
                  <div className="board-options-menu">
                    <button type="button" onClick={() => openBoardEdit(activeUserBoard)}>
                      보드 수정
                    </button>
                    <button className="danger" type="button" onClick={() => deleteBoard(activeUserBoard.id)}>
                      보드 삭제
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {error ? <div className="empty">레퍼런스를 불러오지 못했습니다.</div> : null}
          {isLoading ? <div className="empty">불러오는 중입니다.</div> : null}
          {!isLoading && references.length === 0 ? (
            <div className="empty">
              <p className="muted">아직 저장된 레퍼런스가 없습니다.</p>
              <a className="button primary" href={newReferenceHref} style={{ marginTop: 14 }}>
                첫 레퍼런스 추가
              </a>
            </div>
          ) : (
            <section className="masonry-grid" aria-label="레퍼런스 목록">
              {references.map((reference) => (
                <ReferenceCard
                  key={reference.id}
                  reference={reference}
                  boards={boards}
                  boardIds={referenceBoardIds.get(reference.id) ?? []}
                  activeBoardId={activeUserBoard?.id}
                  onToggleFavorite={toggleFavorite}
                  onAddToBoard={addReferenceToBoard}
                  onRemoveFromBoard={removeReferenceFromBoard}
                  onCreateBoard={createBoardWithName}
                />
              ))}
            </section>
          )}
          {activeUserBoard && isBoardEditOpen ? (
            <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsBoardEditOpen(false)}>
              <section className="save-modal board-edit-modal" role="dialog" aria-modal="true" aria-label="보드 수정" onMouseDown={(event) => event.stopPropagation()}>
                <div className="save-modal-header">
                  <h3>보드 수정</h3>
                  <button className="modal-close" type="button" aria-label="닫기" onClick={() => setIsBoardEditOpen(false)}>
                    ×
                  </button>
                </div>
                <label className="label">
                  이름
                  <input
                    className="field"
                    value={boardEditName}
                    onChange={(event) => setBoardEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        updateBoardDetails();
                      }
                    }}
                    autoFocus
                  />
                </label>
                <label className="label">
                  설명
                  <textarea
                    className="textarea board-description-input"
                    value={boardEditDescription}
                    onChange={(event) => setBoardEditDescription(event.target.value)}
                    placeholder="이 보드에 모으는 레퍼런스의 맥락을 적어보세요."
                  />
                </label>
                <div className="actions">
                  <button className="button primary" type="button" onClick={updateBoardDetails}>
                    완료
                  </button>
                  <button className="button" type="button" onClick={() => setIsBoardEditOpen(false)}>
                    취소
                  </button>
                </div>
                {boardError ? <p className="error">{boardError}</p> : null}
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
