import React, { useEffect, useId, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { BrandWordmark } from "../shared/ui/BrandWordmark";
import {
  ActionButton,
  ActionMenu,
  BookCard,
  ChapterRow,
  Choice,
  CitationRow,
  DesignSystem,
  Dialog,
  Field,
  IconButton,
  MemoField,
  Notice,
  Panel,
  SearchField,
  SelectField,
} from "../shared/ui/design-system";
import "./showcase.css";

type System = "A" | "B" | "C";
type Screen =
  | "reading"
  | "login"
  | "library"
  | "books"
  | "settings"
  | "components";
const systems: System[] = ["A", "B", "C"];
const titles = { A: "따뜻한 서재", B: "출판 편집", C: "현대적 도서관" };
const screens: [Screen, string][] = [
  ["reading", "읽기"],
  ["library", "저자"],
  ["books", "책"],
  ["login", "로그인"],
  ["settings", "설정"],
  ["components", "컴포넌트"],
];
const bookTitles = [
  "천천히 읽고 오래 기억하는 문장들",
  "여백의 시간",
  "언어와 생각",
];
const fixtureQuotes = [
  "좋은 기록은 다시 읽을 때 새로운 질문을 만든다. 오늘의 생각을 한 문장으로 남겨 본다.",
  "읽는 속도를 늦추면 문장 사이에서 놓쳤던 연결을 발견할 수 있다.",
  "작은 메모 하나가 다음 독서의 방향을 바꾼다.",
];
const initialMemo = "읽고 남긴 문장이 다시 생각을 시작하는 출발점이 된다.";

function ScreenExample({
  system,
  mode,
  screen,
  onScreen,
  onMode,
  onSystem,
  compact,
}: {
  compact: boolean;
  system: System;
  mode: "light" | "dark";
  screen: Screen;
  onScreen: (screen: Screen) => void;
  onMode: (mode: "light" | "dark") => void;
  onSystem: (system: System) => void;
}) {
  const id = useId();
  const [memo, setMemo] = useState(initialMemo);
  const [draft, setDraft] = useState("");
  const [quotes, setQuotes] = useState(fixtureQuotes);
  const [chapters, setChapters] = useState<string[]>([]);
  const [books, setBooks] = useState(bookTitles);
  const [authorNames, setAuthorNames] = useState([
    "김기록",
    "박산책",
    "이여백",
    "정사유",
    "한서재",
    "윤느림",
  ]);
  const [dialogInput, setDialogInput] = useState("");
  const [page, setPage] = useState("");
  const [pages, setPages] = useState<Record<string, string>>({});
  const [passageNote, setPassageNote] = useState(
    "이 문장에서 떠오른 생각을 적어 둔다. 다음에 읽을 때 원문과 함께 비교한다.",
  );
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState(true);
  const [memoOpen, setMemoOpen] = useState(
    !compact && window.innerWidth >= 1024,
  );
  useEffect(() => {
    setMemoOpen(!compact && window.innerWidth >= 1024);
  }, [compact]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [kind, setKind] = useState("citation");
  const [dialog, setDialog] = useState("");
  const [notice, setNotice] = useState("");
  const [size, setSize] = useState("16");
  const [font, setFont] = useState("serif");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const save = () => {
    if (!draft.trim()) {
      setNotice("기록할 내용을 입력하세요.");
      return;
    }
    if (kind === "chapter")
      setChapters((current) => [...current, draft.trim()]);
    else {
      setQuotes((current) => [...current, draft.trim()]);
      setPages((current) => ({ ...current, [draft.trim()]: page || "—" }));
    }
    setPage("");
    setDraft("");
    setNotice(
      kind === "chapter" ? "챕터를 추가했습니다." : "문장을 저장했습니다.",
    );
  };
  const sidebar = (
    <aside
      className={`show-library ${libraryOpen ? "is-open" : ""}`}
      aria-label="서재 탐색"
    >
      <div className="show-sidebar-heading">
        <strong>내 서재</strong>
        <IconButton label="탐색 닫기" onClick={() => setLibraryOpen(false)}>
          <X size={16} />
        </IconButton>
      </div>
      <SearchField
        label="이 책의 인용문 검색"
        placeholder="문장 검색"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ActionButton variant="ghost" onClick={() => onScreen("library")}>
        <BookOpen size={16} /> 모든 저자 <span className="show-count">6</span>
      </ActionButton>
      <div className="show-tree-author">
        김기록 <span>3</span>
      </div>
      {books.map((title, i) => (
        <ActionButton
          key={title}
          variant="ghost"
          pressed={i === 0}
          onClick={() => {
            onScreen("reading");
            setLibraryOpen(false);
          }}
        >
          <BookOpen size={14} />
          <span>{title}</span>
        </ActionButton>
      ))}
      {["박산책", "이여백", "정사유", "한서재", "윤느림"].map((name) => (
        <ActionButton
          key={name}
          variant="ghost"
          onClick={() => onScreen("library")}
        >
          <ChevronRight size={14} />
          {name}
        </ActionButton>
      ))}
    </aside>
  );
  const memoPanel = (
    <aside
      className={`show-memo ${memoOpen ? "is-open" : ""}`}
      aria-label="책 메모"
    >
      <div className="show-section-line">
        <h2>책 메모</h2>
        <IconButton label="책 메모 닫기" onClick={() => setMemoOpen(false)}>
          <X size={16} />
        </IconButton>
      </div>
      <MemoField
        label="이 책에 대한 생각"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        rows={7}
      />
      <ActionButton
        variant="ghost"
        onClick={() => setNotice("책 메모를 저장했습니다.")}
      >
        저장
      </ActionButton>
    </aside>
  );
  return (
    <DesignSystem variant={system} mode={screen === "login" ? "light" : mode}>
      <article
        className="show-stage"
        data-stage={system}
        data-system={system}
        data-mode={mode}
        data-screen={screen}
        style={
          {
            "--show-reader-size": `${size}px`,
            "--show-reader-font":
              font === "serif"
                ? '"Nanum Myeongjo", Georgia, serif'
                : "Pretendard, sans-serif",
          } as React.CSSProperties
        }
      >
        {screen !== "login" && (
          <header className="show-app-header">
            <div className="show-brand-group">
              <IconButton
                label="탐색 열기"
                onClick={() => setLibraryOpen(!libraryOpen)}
              >
                <Menu size={19} />
              </IconButton>
              <button
                type="button"
                className="show-wordmark"
                aria-label="410pages 홈으로 이동"
                onClick={() => onScreen("library")}
              >
                <BrandWordmark />
              </button>
            </div>
            <div className="show-header-search">
              <SearchField
                label="서재 검색"
                placeholder="서재에서 문장 찾기"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <IconButton label="설정 열기" onClick={() => onScreen("settings")}>
              <Settings size={18} />
            </IconButton>
          </header>
        )}
        {notice && (
          <div className="show-feedback">
            <Notice tone="info">
              {notice}
              <IconButton label="알림 닫기" onClick={() => setNotice("")}>
                <X size={14} />
              </IconButton>
            </Notice>
          </div>
        )}
        {screen === "login" ? (
          <div className="show-auth">
            <section className="show-auth-card">
              <div className="show-auth-brand">
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 6 L12 3 H18 V18 L13 21 H7 V6" />
                </svg>
                <div className="show-wordmark">
                  <BrandWordmark />
                </div>
                <h1 lang="es">La biblioteca de Babel</h1>
                <p>“이 방법으로 스물세 글자의 여러 조합을 살펴볼 수 있다…”</p>
                <small>로버트 버턴, 『우울의 해부』</small>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setNotice("입력한 내용은 이 미리보기 안에 유지됩니다.");
                }}
              >
                <Field
                  label="이메일"
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  required
                />
                <div className="show-password">
                  <Field
                    label="비밀번호"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="비밀번호 입력"
                    required
                  />
                  <ActionButton
                    variant="ghost"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                  >
                    {passwordVisible ? "숨기기" : "표시"}
                  </ActionButton>
                </div>
                <div className="show-choice-row">
                  <Choice label="아이디 기억" />
                  <Choice label="자동 로그인" />
                </div>
                <ActionButton type="submit" variant="primary">
                  로그인
                </ActionButton>
                <div className="show-auth-links">
                  <ActionButton
                    variant="ghost"
                    onClick={() => setDialog("비밀번호 찾기")}
                  >
                    비밀번호 찾기
                  </ActionButton>
                  <ActionButton
                    variant="ghost"
                    onClick={() => setDialog("가입하기")}
                  >
                    가입하기
                  </ActionButton>
                </div>
              </form>
            </section>
          </div>
        ) : (
          <div className="show-app-body">
            {sidebar}
            <main className="show-content">
              {screen === "reading" && (
                <div className="show-reader">
                  <div className="show-reader-tools">
                    <ActionButton
                      variant="ghost"
                      pressed={notes}
                      onClick={() => setNotes(!notes)}
                    >
                      문장 메모
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      pressed={memoOpen}
                      onClick={() => setMemoOpen(!memoOpen)}
                    >
                      책 메모
                    </ActionButton>
                    <ActionMenu label="책 관리">
                      <ActionButton
                        variant="ghost"
                        onClick={() => setDialog("책 이름 변경")}
                      >
                        이름 변경
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => setDialog("책 삭제")}
                      >
                        삭제
                      </ActionButton>
                    </ActionMenu>
                  </div>
                  <header className="show-reader-title">
                    <ActionButton
                      variant="ghost"
                      onClick={() => onScreen("library")}
                    >
                      김기록
                    </ActionButton>
                    <h1>{books[0] || bookTitles[0]}</h1>
                  </header>
                  <div className="show-reading-scroll">
                    <div className="show-reading-columns">
                      <div className="show-passages">
                        <ChapterRow
                          title="1장 읽기를 시작하며"
                          meta="p. 1"
                          onClick={() => setNotice("1장 읽기를 시작하며")}
                        />
                        {quotes
                          .filter((quote) => quote.includes(search))
                          .map((quote, i) => (
                            <div
                              className="show-citation-wrap"
                              key={`${i}-${quote}`}
                            >
                              <div className="show-passage-note">
                                {notes && i % 2 === 0 && <p>{passageNote}</p>}
                              </div>
                              <CitationRow
                                quote={quote}
                                source={`p. ${pages[quote] ?? 12 + i * 4}`}
                                actions={
                                  <>
                                    <IconButton
                                      label="문장 복사"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(
                                            quote,
                                          );
                                          setNotice("문장을 복사했습니다.");
                                        } catch {
                                          setNotice("복사 권한을 확인하세요.");
                                        }
                                      }}
                                    >
                                      <Copy size={15} />
                                    </IconButton>
                                    <IconButton
                                      label="문장 메모 열기"
                                      onClick={() => setDialog("문장 메모")}
                                    >
                                      <MoreHorizontal size={17} />
                                    </IconButton>
                                  </>
                                }
                              />
                            </div>
                          ))}
                        <ChapterRow
                          title="2장 문장에서 생각으로"
                          meta="p. 35"
                          onClick={() => setNotice("2장 문장에서 생각으로")}
                        />
                        {chapters.map((title, i) => (
                          <ChapterRow
                            key={`${i}-${title}`}
                            title={title}
                            onClick={() => setNotice(title)}
                          />
                        ))}
                      </div>
                      {memoPanel}
                    </div>
                  </div>
                  <form
                    className="show-composer"
                    onSubmit={(event) => {
                      event.preventDefault();
                      save();
                    }}
                  >
                    <MemoField
                      label={
                        kind === "chapter" ? "챕터 제목 입력" : "인용문 입력"
                      }
                      placeholder={
                        kind === "chapter"
                          ? "챕터 제목"
                          : "문장, 인용문 또는 단어를 입력하세요"
                      }
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={2}
                    />
                    <div className="show-composer-bottom">
                      <div>
                        <ActionButton
                          variant="ghost"
                          pressed={kind === "citation"}
                          onClick={() => setKind("citation")}
                        >
                          인용문
                        </ActionButton>
                        <ActionButton
                          variant="ghost"
                          pressed={kind === "chapter"}
                          onClick={() => setKind("chapter")}
                        >
                          챕터
                        </ActionButton>
                      </div>
                      <div className="show-composer-send">
                        <Field
                          label="페이지"
                          value={page}
                          onChange={(event) => setPage(event.target.value)}
                          inputMode="numeric"
                          placeholder="페이지"
                        />
                        <IconButton
                          type="submit"
                          variant="primary"
                          label="문장 저장"
                        >
                          <ArrowUp size={18} />
                        </IconButton>
                      </div>
                    </div>
                  </form>
                </div>
              )}
              {screen === "library" && (
                <section className="show-library-page">
                  <div className="show-page-heading">
                    <div>
                      <h1>저자를 고르세요</h1>
                      <p>
                        {authorNames.length}명의 저자 · {13 + books.length - 3}
                        권의 책
                      </p>
                    </div>
                  </div>
                  <div className="show-author-list">
                    {authorNames.map((name, i) => (
                      <ActionButton
                        key={name}
                        variant="secondary"
                        onClick={() => onScreen("books")}
                      >
                        {name}
                        <span>{[3, 2, 4, 1, 2, 1][i] ?? 0}권</span>
                      </ActionButton>
                    ))}
                  </div>
                  <ActionButton
                    variant="ghost"
                    onClick={() => setDialog("저자 추가")}
                  >
                    <Plus size={15} />
                    저자 추가
                  </ActionButton>
                </section>
              )}
              {screen === "books" && (
                <section className="show-library-page">
                  <div className="show-page-heading">
                    <div>
                      <h1>김기록</h1>
                      <p>
                        {books.length}권의 책 · {quotes.length}개의 문장
                      </p>
                    </div>
                    <ActionButton
                      variant="primary"
                      onClick={() => setDialog("책 추가")}
                    >
                      <Plus size={16} />책 추가
                    </ActionButton>
                  </div>
                  <div className="show-book-grid">
                    {books.map((title, i) => (
                      <BookCard
                        key={title}
                        title={title}
                        author="김기록"
                        meta={`${[6, 4, 2][i] ?? 0}개의 문장`}
                        cover={
                          <button
                            type="button"
                            className={`show-cover show-cover-${i}`}
                            onClick={() => onScreen("reading")}
                            aria-label={`${title} 열기`}
                          >
                            <span>KIM GIROK</span>
                            <strong>{title}</strong>
                            <small>김기록</small>
                          </button>
                        }
                        actions={
                          <ActionButton
                            variant="ghost"
                            onClick={() => onScreen("reading")}
                          >
                            책 열기 <ChevronRight size={14} />
                          </ActionButton>
                        }
                      />
                    ))}
                  </div>
                  <div className="show-section-line">
                    <h2>저자</h2>
                    <ActionButton
                      variant="ghost"
                      onClick={() => setDialog("저자 추가")}
                    >
                      <Plus size={15} />
                      저자 추가
                    </ActionButton>
                  </div>
                  <div className="show-author-list">
                    {authorNames.map((name, i) => (
                      <ActionButton
                        key={name}
                        variant="secondary"
                        onClick={() => onScreen("books")}
                      >
                        {name}
                        <span>{[3, 2, 4, 1, 2, 1][i] ?? 0}권</span>
                      </ActionButton>
                    ))}
                  </div>
                </section>
              )}
              {screen === "settings" && (
                <section className="show-settings">
                  <ActionButton
                    variant="ghost"
                    onClick={() => onScreen("reading")}
                  >
                    <ArrowLeft size={15} />
                    서재로 돌아가기
                  </ActionButton>
                  <h1>설정</h1>
                  <Panel title="화면">
                    <SelectField
                      label="화면 모드"
                      value={mode}
                      onChange={(event) =>
                        onMode(event.target.value as "light" | "dark")
                      }
                    >
                      <option value="light">밝은 화면</option>
                      <option value="dark">어두운 화면</option>
                    </SelectField>
                    <SelectField
                      label="서재 테마"
                      value={system}
                      onChange={(event) =>
                        onSystem(event.target.value as System)
                      }
                    >
                      {systems.map((item) => (
                        <option key={item} value={item}>
                          {item} · {titles[item]}
                        </option>
                      ))}
                    </SelectField>
                  </Panel>
                  <Panel title="읽기">
                    <SelectField
                      label="서체"
                      value={font}
                      onChange={(event) => setFont(event.target.value)}
                    >
                      <option value="serif">나눔명조</option>
                      <option value="sans">프리텐다드</option>
                    </SelectField>
                    <Field
                      type="range"
                      min="14"
                      max="24"
                      label={`글자 크기 · ${size}px`}
                      value={size}
                      onChange={(event) => setSize(event.target.value)}
                    />
                    <blockquote className="show-type-preview">
                      {fixtureQuotes[1]}
                    </blockquote>
                    <Choice
                      kind="switch"
                      label="문장 메모 표시"
                      checked={notes}
                      onChange={(event) => setNotes(event.target.checked)}
                    />
                  </Panel>
                  <Panel title="계정">
                    <p>김기록</p>
                    <ActionButton
                      variant="secondary"
                      onClick={() => onScreen("login")}
                    >
                      로그아웃
                    </ActionButton>
                  </Panel>
                </section>
              )}
              {screen === "components" && (
                <section className="show-components">
                  <h1>컴포넌트</h1>
                  <Panel title="기록하기">
                    <div className="show-component-buttons">
                      <ActionButton
                        variant="primary"
                        onClick={() => setNotice("저장했습니다.")}
                      >
                        <Check size={16} />
                        저장
                      </ActionButton>
                      <ActionButton onClick={() => setDialog("새 기록")}>
                        추가
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => setDialog("기록 삭제")}
                      >
                        삭제
                      </ActionButton>
                      <IconButton
                        label="검색"
                        onClick={() => setDialog("서재 검색")}
                      >
                        <Search size={16} />
                      </IconButton>
                    </div>
                    <div
                      className="show-component-buttons show-state-examples"
                      aria-label="버튼 상태 비교"
                    >
                      <ActionButton disabled>비활성</ActionButton>
                      <ActionButton variant="primary" loading>
                        처리 중
                      </ActionButton>
                      <ActionButton pressed>선택됨</ActionButton>
                    </div>
                    <Field label="저자" placeholder="저자 이름" />
                    <Field
                      label="책 제목"
                      defaultValue="여백의 시간"
                      hint="서재에 표시할 책 이름입니다."
                    />
                    <Field
                      label="이메일"
                      error="이메일 형식을 확인하세요."
                      defaultValue="girok@"
                    />
                    <MemoField
                      label="메모"
                      value={memo}
                      onChange={(event) => setMemo(event.target.value)}
                    />
                    <SelectField label="정렬">
                      <option>최근 기록순</option>
                      <option>이름순</option>
                    </SelectField>
                    <Choice label="아이디 기억" />
                    <Choice
                      kind="radio"
                      name={`sort-${id}`}
                      label="이름순"
                      defaultChecked
                    />
                    <Choice
                      kind="radio"
                      name={`sort-${id}`}
                      label="최근 기록순"
                    />
                    <Choice
                      kind="switch"
                      label="문장 메모 표시"
                      defaultChecked
                    />
                  </Panel>
                  <Notice tone="success" title="저장했습니다.">
                    서재에 기록을 남겼습니다.
                  </Notice>
                  <Notice tone="danger" title="연결을 확인하세요.">
                    입력한 내용이 유지됩니다.
                    <ActionButton
                      variant="ghost"
                      onClick={() => setNotice("다시 시도했습니다.")}
                    >
                      다시 시도
                    </ActionButton>
                  </Notice>
                  <ActionMenu label="기록 관리">
                    <ActionButton
                      variant="ghost"
                      onClick={() => setDialog("이름 변경")}
                    >
                      이름 변경
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDialog("기록 삭제")}
                    >
                      삭제
                    </ActionButton>
                  </ActionMenu>
                </section>
              )}
            </main>
          </div>
        )}
        <Dialog
          open={Boolean(dialog)}
          title={dialog}
          onClose={() => setDialog("")}
          footer={
            <>
              <ActionButton onClick={() => setDialog("")}>취소</ActionButton>
              <ActionButton
                variant={dialog.includes("삭제") ? "danger" : "primary"}
                onClick={() => {
                  if (dialog === "책 삭제") {
                    setBooks((current) => current.slice(1));
                    onScreen("books");
                  } else if (dialog.includes("삭제"))
                    setQuotes((current) => current.slice(0, -1));
                  else if (dialog === "책 추가" && dialogInput.trim())
                    setBooks((current) => [...current, dialogInput.trim()]);
                  else if (dialog === "저자 추가" && dialogInput.trim())
                    setAuthorNames((current) => [
                      ...current,
                      dialogInput.trim(),
                    ]);
                  else if (
                    (dialog === "책 이름 변경" || dialog === "이름 변경") &&
                    dialogInput.trim()
                  )
                    setBooks((current) => [
                      dialogInput.trim(),
                      ...current.slice(1),
                    ]);
                  else if (dialog === "문장 메모") setPassageNote(dialogInput);
                  else if (dialog.includes("검색")) setSearch(dialogInput);
                  else if (dialog === "새 기록" && dialogInput.trim())
                    setQuotes((current) => [...current, dialogInput.trim()]);
                  setDialogInput("");
                  setDialog("");
                }}
              >
                {" "}
                {dialog.includes("삭제") ? "삭제" : "저장"}
              </ActionButton>
            </>
          }
        >
          {dialog.includes("삭제") ? (
            <p>이 미리보기의 기록을 삭제할까요?</p>
          ) : (
            <Field
              label={
                dialog.includes("비밀번호") || dialog.includes("가입")
                  ? "이메일"
                  : dialog.includes("검색")
                    ? "검색어"
                    : "내용"
              }
              autoFocus
              value={dialogInput}
              onChange={(event) => setDialogInput(event.target.value)}
              placeholder={dialog.includes("검색") ? "서재 검색" : ""}
            />
          )}
        </Dialog>
      </article>
    </DesignSystem>
  );
}

export default function Showcase() {
  const params = new URLSearchParams(window.location.search);
  const [system, setSystem] = useState<System>(
    systems.includes(params.get("system") as System)
      ? (params.get("system") as System)
      : "A",
  );
  const [compare, setCompare] = useState(
    params.get("compare") === "1" || !params.has("system"),
  );
  const [mode, setMode] = useState<"light" | "dark">(
    params.get("mode") === "dark" ? "dark" : "light",
  );
  const [screen, setScreen] = useState<Screen>(
    screens.some(([value]) => value === params.get("screen"))
      ? (params.get("screen") as Screen)
      : "reading",
  );
  const update = (values: {
    system?: System;
    compare?: boolean;
    mode?: "light" | "dark";
    screen?: Screen;
  }) => {
    const next = { system, compare, mode, screen, ...values };
    setSystem(next.system);
    setCompare(next.compare);
    setMode(next.mode);
    setScreen(next.screen);
    try {
      window.history.replaceState(
        null,
        "",
        `?system=${next.system}&compare=${next.compare ? 1 : 0}&mode=${next.mode}&screen=${next.screen}`,
      );
    } catch {
      /* file:// previews keep React state when history updates are unavailable. */
    }
  };
  return (
    <div className="showcase">
      <header className="showcase-toolbar">
        <div className="showcase-title">
          <span>410pages</span>
          <h1>디자인 시스템 비교</h1>
          <p>동일한 React 컴포넌트 · 로컬 예시 데이터</p>
        </div>
        <div className="showcase-controls">
          <div className="showcase-switch" role="group" aria-label="비교 방식">
            <button
              type="button"
              aria-pressed={compare}
              onClick={() => update({ compare: true })}
            >
              3안 나란히
            </button>
            {systems.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={!compare && system === value}
                onClick={() => update({ system: value, compare: false })}
              >
                {value}
              </button>
            ))}
          </div>
          <label>
            화면
            <select
              value={screen}
              onChange={(event) =>
                update({ screen: event.target.value as Screen })
              }
            >
              {screens.map(([value, title]) => (
                <option key={value} value={value}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <div className="showcase-switch" role="group" aria-label="밝기">
            <button
              type="button"
              aria-pressed={mode === "light"}
              onClick={() => update({ mode: "light" })}
            >
              밝게
            </button>
            <button
              type="button"
              aria-pressed={mode === "dark"}
              onClick={() => update({ mode: "dark" })}
            >
              어둡게
            </button>
          </div>
        </div>
      </header>
      <div className={`showcase-grid ${compare ? "is-compare" : "is-solo"}`}>
        {(compare ? systems : [system]).map((value) => (
          <section className="showcase-example" key={value}>
            <header className="showcase-example-title">
              <div>
                <span>{systems.indexOf(value) + 1}</span>
                <h2>
                  {value} · {titles[value]}
                </h2>
              </div>
              {compare && (
                <button
                  type="button"
                  onClick={() => update({ system: value, compare: false })}
                  aria-label={`${value}안 크게 보기`}
                >
                  크게 보기 ↗
                </button>
              )}
            </header>
            <ScreenExample
              compact={compare}
              system={value}
              mode={mode}
              screen={screen}
              onScreen={(value) => update({ screen: value })}
              onMode={(value) => update({ mode: value })}
              onSystem={(value) => update({ system: value, compare: false })}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
