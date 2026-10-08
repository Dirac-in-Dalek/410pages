# 선택한 텍스트의 서식

인용문(폴더 모아보기와 책 본문), 저장된 댓글, 책 전체 메모에서 텍스트를 선택하면 공통 도구창이 열린다. 선택 자체로는 서식을 바꾸거나 저장하지 않는다. 굵게·기울임·밑줄·하이라이트를 중첩할 수 있으며, 다시 누르면 선택 범위에서 해당 서식만 제거한다. 기존 노란 하이라이트도 이어서 표시한다.

글자 크기는 중앙 설정을 상속하고 `fontSizeOffset`만 저장한다. −/+ 버튼은 선택한 각 구간의 크기를 1pt씩 바꾸며, 혼합 크기도 각자의 상대값을 유지한다. 기본/+2pt 등의 표시를 누르면 중앙 설정 크기로 돌아간다. 범위는 기본 대비 −4pt부터 +8pt다. 중앙 크기 변경 시 상대값은 그대로 남는다.

책 전체 메모는 Tiptap/ProseMirror 편집기를 사용한다. 텍스트와 서식을 함께 800ms 뒤 자동 저장하고, 실패한 초안도 같은 저장 값에 함께 보관한다. 기존 텍스트 초안은 계속 복구한다. 접기/펴기로 편집기를 다시 만들지 않는다. 조합 입력 중에는 자동 저장과 도구창 표시를 미루고, 일반 텍스트로 붙여넣어 외부 고정 글자 크기와 HTML이 들어오지 않도록 한다. 인용문·댓글의 기존 텍스트 수정 화면에서도 살아남은 구간의 서식을 옮긴다.

읽기 화면은 Shift+F10으로 표시된 텍스트 전체의 도구창을 열 수 있다. 도구창 버튼은 키보드로 이동할 수 있고, Esc로 닫는다. 모바일 메모에서는 서식 도구창을 먼저 닫고, 다음 Esc로 메모 창을 닫는다. 편집용 댓글 입력칸은 기존 텍스트 입력 방식이며, 저장된 댓글에서 서식을 지정한다.

## Notion 공식 자료

2026-10-08에 아래 공식 도움말을 확인했다.

- [Writing & editing basics](https://www.notion.com/help/writing-and-editing-basics): 텍스트 선택 후 편집 메뉴가 나타나며, 모바일에서는 선택과 키보드 위 도구 모음을 안내한다.
- [Customize & style your content](https://www.notion.com/help/customize-and-style-your-content): 선택 메뉴에서 일반 서식과 글자색/배경 강조를 지정한다. Small text는 페이지 설정이다.
- [Keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts): 선택 범위의 굵게·기울임·밑줄 단축키를 안내한다.

410pages는 데스크톱·모바일에서 같은 선택 도구창을 사용한다. 중앙 설정 대비 ±1pt 조절은 이번 요청에 맞춘 기능이며, Notion의 글자 크기 기능을 복제한 것으로 설명하지 않는다.

## 배포 순서

1. 운영 프로젝트의 SQL Editor에서 [`20261008120000_add_text_formatting.sql`](../../supabase/migrations/20261008120000_add_text_formatting.sql)을 실행한다. 기존 마이그레이션이 적용된 프로젝트가 전제다. SQL은 트랜잭션으로 묶여 있다.
2. 아래 확인 SQL을 실행해 세 열과 함수가 존재하는지 확인한다.
3. PR의 CI·리뷰가 통과한 후 클라이언트를 배포한다. 이 순서를 지켜야 메모 저장 RPC가 실패하지 않는다.

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('citations', 'text_formats'), ('notes', 'text_formats'), ('books', 'memo_formats')
  );
select to_regprocedure('public.save_text_formatting(text,uuid,text,text,jsonb)') as save_function;
```

마이그레이션은 기존 본문을 바꾸지 않고 JSONB 서식 열을 기본 빈 배열로 추가한다. 범위·서식 종류·상대 크기를 CHECK 제약으로 검증하며, JS와 같은 UTF-16 위치를 사용한다. 저장 RPC는 `SECURITY INVOKER`로 기존 RLS를 따르고 현재 사용자 소유의 행을 잠근 후 본문을 비교한다. 다른 창에서 본문이 바뀌었으면 `40001`로 거절한다. 인용문 하이라이트는 기존 `highlights`에도 반영한다. 책·저자 병합 함수는 메모 본문과 서식의 위치를 함께 병합한다.

서식 저장 충돌 시에는 입력한 메모 초안을 복사해 두고 서버의 최신 본문을 다시 불러와 비교해야 한다. 이 RPC는 공동 편집이나 서로 다른 창의 서식 변경을 자동 병합하는 기능은 제공하지 않는다.

## 검증

- Vitest: 서식 겹침/토글/상대 크기, 텍스트 수정 후 범위 보존, 이모지/줄바꿈 변환, 저장 순서와 실패 롤백, 초안 복구, 기존 로그인·설정·읽기 기능 회귀 검사.
- PGlite의 실제 PostgreSQL 엔진: 새 마이그레이션 실행, UTF-16 저장, 레거시 하이라이트 반영, 잘못된 JSON/범위 거절, RLS와 익명 호출 차단, 본문 충돌 거절, 메모와 서식의 원자적 저장, 책·저자 병합.
- Chromium과 가짜 Supabase API: 메인/책/댓글/메모 서식 버튼, 연속 크기 조절, 상대 크기의 중앙 설정 상속, 320/1024/1440/3840px, 접기/펴기, 새로고침, 저장 실패 초안과 재시도. 스크린샷은 로컬 `output/playwright/text-format-*.png`에 저장된다.
- 운영 DB에는 공개 키를 이용한 읽기 전용 API 확인만 수행했다. 새 열은 현재 `42703`(열 없음)을 반환하므로 운영 DB 마이그레이션 적용 확인 전에는 배포하지 않는다.
