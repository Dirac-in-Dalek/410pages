# 읽기 화면 일괄 개선 검증

상태: 기능 수정과 확인 범위의 독립 재리뷰 완료. 최종 미해결 지적 없음. 실제 배포·병합은 하지 않았다.

## UI 문제 10개 대조

| 문제 | 반영한 변경 |
|---|---|
| 1. 본문보다 보조 패널이 우세 | 책 전체 메모는 버튼으로 열고, 닫힌 보조 패널의 공간을 일반 읽기 영역에 반영. 서재 토글을 상단에 명확히 표시 |
| 2. 불필요한 여백 | 기본 데스크톱 챕터 행 64→48px, 빈 입력 텍스트 영역 52→40px. 하단 고정과 자동 확장 유지 |
| 3. 반복되는 선 | 기존 추가 경계만 재사용하고 선의 강도 축소. 연결선은 본문·조작·편집 영역을 피해 그림 |
| 4. 상자 안의 상자 | 상세 편집 외곽 카드·중복 테두리·그림자 축소, 입력은 배경으로 구분 |
| 5. 메모 소속 불명확 | 책 전체 메모 / 이 문장 메모 / 인용문 메모로 범위 구분 |
| 6. 저장 상태 불명확 | 자동 저장·저장 중·저장됨·실패 표시, 지금 저장/다시 저장 제공 |
| 7. 탐색·정리 혼재 | 최근 기록한 책 / 서재 정리 / 인용문 모아보기 구분, 강한 새 폴더 강조 축소 |
| 8. 숨은 조작 | 목록 사용법, 호버·초점 손잡이, 왼쪽 전용 조작 자리와 설명 제공 |
| 9. 행별 전체 조작 | 데스크톱 인용문 메모 전체 조작을 목록 위 한 곳으로 이동. 서재 접기와 독립 |
| 10. 편집창이 본문을 가림 | 인용문 위치에서 상세 편집. 다른 내용은 읽을 수 있고 초안·저장 잠금은 화면 전환에도 보존 |

## 추가 이동 요구 5개 대조

| 요구 | 검증 |
|---|---|
| 왼쪽 손잡이 전용 자리 | 손잡이와 체크박스 44px 영역 분리, 본문 공통 시작선 유지 |
| 긴 인용문·강조·페이지·메모·선택 영역 | 긴 모의 인용문 실제 이동 전후 점검, 본문 선택 강조 저장과 기존 필드 보존 |
| 연결선·드롭 안내 | 목적지 안내와 저장 위치 일치, SVG 경로와 본문/조작 영역 교차 0 |
| 마지막 인용문과 하단 입력 | 좁은 화면에서도 마지막 인용문 조작을 고정 입력창 위로 스크롤 가능 |
| 취소·실패·복원·키보드·좁은 화면 | 실제 마우스 드래그, 취소 시 요청 없음, 실패 재시도, 새로고침, 키보드 이동 후 좁은 화면 드래그 복귀 |

## 리뷰에서 찾아 수정한 회귀

- 챕터 여백 축소 후 추가 클릭 영역이 수정 버튼 가장자리를 가로채는 문제: 조작의 쌓임 순서 수정, 버튼 하단 2px 실제 클릭 확인.
- 상세 진입 시 기존 구절 메모 초안 유실: 원래 행을 숨긴 채 유지. 신규 메모·기존 메모 수정·실패 후 초안 검사.
- 검색으로 편집 카드가 제거될 때 초안 유실: 로그인 세션 소유의 반응형 편집 상태로 복원.
- 저장 지연 중 재마운트 후 초안 유실·재전송: 입력·저장 상태를 같은 소유자에서 관리하고 현재 화면에 완료 반영.
- 변경 없는 저장 중 바깥 클릭으로 잠금 해제: 저장 중 취소 방지.
- 이전 출처가 캐시에 남아 새 이름 변경을 되돌리는 문제: 새 본문 편집은 현재 인용문의 출처·본문·페이지로 시작.

## 실행 근거

- 자동 검사: Node.js v24.13.0에서 `npm test` — 70개 파일 / 497개 통과. `/tmp/reading-release-tests.log`.
- 타입 검사: `npm exec tsc -- --noEmit` 통과 — `/tmp/reading-release-types.log`.
- 빌드: `npm run build` 통과 — 모의 Supabase 주소를 주입한 검사 빌드, `/tmp/reading-release-build.log`.
- 브라우저: `scripts/qa-reading-refinement.js`, 기존 `scripts/qa-chapter-editing.js`.
- 개발 어두운 테마·18pt: `/tmp/reading-dark-large-final.log` (프로필에 night/18pt를 넣어 새로고침 후에도 유지).
- 빌드 어두운 테마: `/tmp/reading-production-dark.log` 통과. 기존 챕터 전체 브라우저 회귀도 `/tmp/reading-production-chapters.log` 통과. 큰 글자에서도 제목 첫 줄과 수정·삭제 버튼 중심이 일치함을 확인했다.
- 초안 지연 응답·재마운트 및 현재 출처: `CitationCard.draft-lifecycle.test.tsx`.
- 신규·기존·실패 메모와 검색 복귀: `CitationList.inline-comments.test.tsx`.

## 화면

- [개선된 읽기 화면](../../output/playwright/reading-refinement-1440.png)
- [행내 편집](../../output/playwright/reading-inline-edit-1440.png)
- [어두운 테마·큰 글자](../../output/playwright/reading-refinement-dark-large-1440.png)
- [좁은 화면·큰 글자](../../output/playwright/reading-refinement-dark-large-375.png)

## 범위와 한계

검사는 격리 모의 데이터와 API로 수행했다. 실제 사용자용 로컬3000은 비파괴적으로 확인하고 유지했다. 이번 일괄 수정에서 실제 사용자 인용문 이동, 운영 DB 변경, 배포·병합·푸시는 하지 않았다. 실기기 터치·Safari·운영 배포 환경의 실제 요청은 별도 미검증이다. 기존 기본 문장 저장의 브라우저 복구와 이번 접속 중 상세 편집 초안 보존은 서로 다른 범위다. 상세 편집 초안에 새로고침 이후 영구 복구를 추가하지 않았다.

사용자 결정: UI 문제 10개 일괄 수정, 왼쪽 손잡이와 이동 후 겹침 검증, 배포 전 리뷰 반복.
Codex 결정: 패널 기본 상태·문구·치수·행내 편집·회귀 방지용 상태 관리. 사용자 직접 문구/구조 지정으로 기록하지 않는다.
기존 동작 유지: 계층 저장·챕터 제목 이동·구분선 추가·하단 입력·선택 강조·저장 API.
미검증 사항: 현재 변경의 원격 CI, 운영 환경 변수와 운영 API 요청, 실기기 터치·Safari.
남은 사용자 결정: 실제 배포·병합 여부.

검증 로그와 소스 해시: /Users/life_habit/.codex/visualizations/2026/09/10/01a08b83-ccd9-7750-9581-0ec7a985e71b/review-evidence/reading-refinement

원격 CI는 현재 미커밋 변경을 실행한 결과가 아니다. 로컬 검증 기준은 README/CI와 같은 Node24이며, 외부 독립 검사 환경의 Node25에서는 jsdom localStorage 초기화 오류가 보고됐다. 운영 환경 변수·실제 운영 API smoke·실기기 검증을 통과한 것으로 확대하지 않는다.


## 외부 독립 검증 대조

동일한 최종 CSS(`f74d5ef5`)·CitationCard(`f28b69c4`) 복사본에서 Node24.13.0 전체 497개 검사·타입·빌드와 계약/보안 재리뷰가 통과했고 미해결 지적은 없었다. night 테마의 1440px/14pt, 1280px/24pt, 800px/24pt, 375px/24pt, 375px/40pt 다섯 조건에서 왼쪽 손잡이·분리된 조작, 가로 넘침 없음, SVG 경로 교차0, 마지막 조작의 입력창 가림 없음, 챕터 첫 줄/관리 버튼 중심 오차1px 이하를 확인했다. 보완 스크립트와 release-dark-*.png는 위 영구 검증 근거 폴더에 보관했다.

핵심 수정 파일: app/AppShell.tsx, components/MainLayout.tsx, index.css, features/archive/ui의 CitationList·CitationCard·ChapterConnections·ArchiveHeader·ArchiveScreen·BookMemoPanel·PassageNotesPanel·ProjectSidebar·ProjectSidebarProjectsSection, features/archive/logic/citationEditDrafts.ts, 관련 계약과 입력창. 전체 검증 소스 목록/해시는 verified-source-sha256.txt를 참조한다.
