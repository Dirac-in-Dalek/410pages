# 410pages

저자 → 책 → 인용문으로 이어지는 개인 독서 아카이브다. React·TypeScript·Vite를 사용하며 데이터와 로그인은 Supabase, 책 표지·목차 조회는 YES24로 연결한다.

## 실행

Node.js 24와 npm을 사용한다. CI도 Node.js 24에서 실행한다.

```sh
npm ci
cp .env.example .env.local
```

`.env.local`에 아래 값을 입력한 뒤 실행한다. 예제 파일에는 실제 키를 넣지 않는다.

| 환경변수 | 용도 | 실행 위치 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL, 앱 실행 필수 | 브라우저·서버 |
| `VITE_SUPABASE_ANON_KEY` | 현재 앱에서 사용하는 공개 anon 키, 앱 실행 필수 | 브라우저·서버 |
| `YES24_API_KEY` | 외부 책 메타데이터 조회를 사용할 때 필요 | 서버만 |

Supabase의 service-role·secret 키를 `VITE_` 변수에 넣지 않는다. Gemini 키는 이 앱에서 사용하지 않는다.

```sh
npm run dev
```

Vite가 출력한 로컬 주소를 연다. `/api/book-metadata`는 Vite 개발 서버의 미들웨어가 처리하므로 별도 API 프로세스는 필요 없다. `YES24_API_KEY`가 없으면 외부 메타데이터 조회가 503을 반환하고, 기존 수동 서재 기능은 사용할 수 있다. 실제 목차를 챕터로 연결하는 규칙은 [챕터 Policy](docs/policies/book-chapters.md)의 남은 결정을 따른다.

## 확인 명령

```sh
npm exec tsc -- --noEmit
npm test
npm run build
```

`npm run preview`는 빌드된 정적 화면을 확인한다. Vite 개발 미들웨어나 배포용 API 함수를 실행하지 않는다. 빌드 통과와 실제 로그인·저장·외부 API 성공은 별도로 확인한다.

## 코드와 문서 찾기

- [기능별 Policy 인덱스](docs/policies/README.md): 사용자가 확정한 동작과 남은 결정.
- [디자인 기준](DESIGN.md): 화면 표현 원칙. 기능 동작은 해당 Policy를 따른다.
- `app/`: 화면 조합, 앱 전체 상태와 반응형 전환.
- `features/`: archive, citation-entry, reader, auth, profile, settings의 전용 코드와 테스트.
- `shared/`: 여러 기능이 쓰는 API·순수 함수·UI.
- `components/`: 공통 데스크톱·모바일 레이아웃.
- `lib/`: 기존 공통 기반 코드. 기능 전용 코드는 해당 features에서 찾는다.
- `api/book-metadata.js`: 배포 플랫폼용 API 진입점.
- `server/yes24.mjs`: 개발 서버와 배포 진입점이 공유하는 YES24 처리.
- `docs/design-reviews/`: 검토·변경 근거. `archive/`의 과거 시안은 확정 정책이 아니다.

`policy/`는 기존 코드 규칙, `contract/`는 타입과 입력·출력, `logic/`는 처리, `ui/`는 화면을 담는다. 빈 하위 폴더를 맞추기 위해 새 파일을 만들지는 않는다.

## 데이터베이스와 배포

`supabase_schema.sql`과 `supabase/migrations/`는 스키마 자료다. 기존 DB에 무조건 다시 적용하지 말고 대상 프로젝트의 적용 이력과 필요한 변경을 확인한다. 마이그레이션 실행과 배포는 로컬 검증 명령에 포함되지 않는다.

배포 환경에도 브라우저용 Supabase 변수와 서버용 YES24 변수를 구분해 설정해야 한다. 이 저장소의 CI는 타입 검사·테스트·빌드만 수행하며 운영 DB 변경이나 배포 성공을 보장하지 않는다.

## Git 생성물

`.playwright-cli/`, `.superpowers/`, `output/playwright/`, `.env.local`, `dist/`, `node_modules/`는 로컬 파일로 유지한다. 보존할 시안·검증 기록만 `docs/design-reviews/`로 선별한다.

## 모의 데이터 브라우저 검사

Playwright CLI 0.1.19로 모바일 44px 조작 영역·제목·검색 결과, 키보드 책 열기, URL 뒤로/앞으로·새로고침, PDF 지연 로딩·실패 재시도를 확인한다. 운영 계정 대신 검토용 세션과 API 응답을 사용하며, 서비스워커는 검증용 브라우저 설정으로 차단한다.

먼저 별도 터미널에서 아래 개발 서버를 실행한다. 실제 프로젝트 키를 사용하지 않는다.

```sh
VITE_SUPABASE_URL=http://127.0.0.1:4199 VITE_SUPABASE_ANON_KEY=local-review-placeholder npm run dev -- --host 127.0.0.1 --port 4199
```

```sh
npx --yes --package @playwright/cli@0.1.19 playwright-cli -s=ui-review open http://127.0.0.1:4199 --config scripts/qa-browser.config.json
npx --yes --package @playwright/cli@0.1.19 playwright-cli -s=ui-review run-code --filename scripts/qa-ui-review.js
npx --yes --package @playwright/cli@0.1.19 playwright-cli -s=ui-review close
```

스크린샷은 Git에서 제외한 `output/playwright/`에 저장한다. 빌드 결과는 같은 출처의 모의 Supabase URL로 빌드한 뒤 `npm run preview` 주소에서 같은 스크립트로 확인할 수 있다. 현재 CI에는 브라우저 검사를 자동 연결하지 않았다. 실기기·운영 API·PWA 오프라인 동작은 이 검사에 포함되지 않는다.

## 하위 챕터 적용

챕터의 단계 값은 `supabase/migrations/20260912001242_add_chapter_depth.sql`에 정의한다. 배포 대상 DB에 이 마이그레이션을 적용한 뒤 하위 단계 저장을 사용할 수 있다. 기존 제목·정렬값·인용문은 변경하지 않고, 기존 챕터는 단계 0으로 시작한다. 2026-09-12 사용자 승인으로 운영 DB에 적용했다. 기존 34개 챕터의 내용·순서 보존, 기본값 0과 제약을 확인했다. 앱 배포는 사용자 확인 후 별도로 결정한다.

동일한 모의 데이터 브라우저 환경에서 아래 검사로 추가·실패 재시도·새로고침·단계 복귀·이동 후 관계와 연결선을 확인한다.

```sh
npx --yes --package @playwright/cli@0.1.19 playwright-cli -s=ui-review run-code --filename scripts/qa-chapter-editing.js
```

해당 명령 전에는 위의 `open` 명령으로 로컬 앱과 `scripts/qa-browser.config.json`을 사용해 검증 브라우저를 열어야 한다. 실제 IME·운영 DB·PWA 검증을 대신하지 않는다.
