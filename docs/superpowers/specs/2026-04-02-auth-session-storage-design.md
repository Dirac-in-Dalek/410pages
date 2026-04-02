# Auth Session Storage Design

## Goal

로그인 화면에 `아이디 기억`과 `자동로그인` 체크박스를 추가하고, 체크 상태에 따라 인증 세션의 지속 범위를 제어한다.

## Current Problem

현재 앱은 Supabase 기본 설정으로 세션을 영구 저장하고, 앱 시작 시 저장된 세션이 있으면 바로 인증 상태를 복원한다. 이 때문에 사용자가 의도적으로 `자동로그인`을 선택하지 않았더라도 브라우저를 완전히 종료한 뒤 재접속 시 로그인 화면을 건너뛰게 된다.

## Desired Behavior

### Login Preferences

- `아이디 기억`
  - 이메일만 저장한다.
  - 다음 방문 시 이메일 입력란만 미리 채운다.
  - 로그인 버튼은 다시 눌러야 한다.
- `자동로그인`
  - 다음 방문 시 로그인 화면을 건너뛰고 바로 인증 상태로 진입한다.
  - 이 옵션은 세션 저장 위치를 영구 저장소로 바꾸는 의미다.
- 비밀번호
  - 앱이 저장하지 않는다.
  - 브라우저 비밀번호 관리자/autofill에 맡긴다.

### Session Lifetime Rules

- `자동로그인 = OFF`
  - 새로고침: 로그인 유지
  - 같은 탭에서 라우팅 이동: 로그인 유지
  - 탭 종료 또는 브라우저 종료 후 재접속: 다시 로그인 필요
- `자동로그인 = ON`
  - 새로고침: 로그인 유지
  - 탭 종료 또는 브라우저 종료 후 재접속: 로그인 유지

### Logout Rules

- 로그아웃 시 `자동로그인`은 해제한다.
- 로그아웃 시 `아이디 기억`은 유지한다.
- 로그아웃 후 재접속하면 이메일은 남아 있지만 자동 진입은 되지 않는다.

## Recommended Approach

Supabase의 `persistSession`은 유지하되, 저장소를 고정 `localStorage`로 두지 않고 사용자 선택에 따라 분기한다.

- `자동로그인 = OFF`일 때는 `sessionStorage` 사용
- `자동로그인 = ON`일 때는 `localStorage` 사용
- `아이디 기억`은 별도 키로 `localStorage`에 저장

이 접근을 쓰면 새로고침 시 세션은 유지되지만, `자동로그인`이 꺼진 상태에서는 탭/브라우저를 닫는 순간 세션이 사라진다. 반대로 `자동로그인`이 켜지면 기존처럼 다음 방문에서도 세션이 복원된다.

## Why This Approach

### Rejected Option 1: `persistSession = false`

이 방식은 로그인 후 새로고침만 해도 세션이 사라진다. 요구사항인 "브라우저를 종료한 다음 재접속하면 로그인"과 맞지 않는다.

### Rejected Option 2: Browser-only autofill

브라우저 autofill은 이메일/비밀번호 입력 보조일 뿐이고, 로그인 상태 유지 여부를 제어하지 못한다. 따라서 `자동로그인` 요구사항을 충족할 수 없다.

### Rejected Option 3: Custom password storage

앱이 비밀번호를 직접 저장하면 보안 비용만 늘고, 브라우저의 검증된 비밀번호 관리자와 역할이 중복된다. 요구사항에도 필요하지 않다.

## Design Details

### Storage Model

앱은 세 종류의 데이터를 분리한다.

- 이메일 기억 상태
  - 저장 위치: `localStorage`
  - 예시 키: `rememberedLoginEmail`
- 자동로그인 여부
  - 저장 위치: `localStorage`
  - 예시 키: `autoLoginEnabled`
- Supabase 세션
  - 저장 위치:
    - `autoLoginEnabled = true`면 `localStorage`
    - 아니면 `sessionStorage`

### Auth Client Strategy

Supabase 클라이언트는 기본 저장소를 그대로 쓰지 않고 커스텀 storage adapter를 주입한다. 이 adapter는 세션 read/write/remove 시점마다 현재 `autoLoginEnabled` 값을 보고 `localStorage` 또는 `sessionStorage`로 라우팅한다.

핵심 원칙:

- `persistSession`은 `true`로 유지
- 세션 저장 위치만 동적으로 선택
- 이메일 기억용 저장소와 인증 세션 저장소를 분리

### Initialization Order

앱 시작 시 순서는 다음과 같다.

1. `autoLoginEnabled` 플래그를 먼저 읽는다.
2. 해당 플래그에 맞는 저장소로 동작하는 auth storage adapter를 준비한다.
3. 그 adapter로 Supabase client를 초기화한다.
4. 그 다음 `getSession()`과 `onAuthStateChange()`를 연결한다.

이 순서를 지켜야 refresh token이나 기존 세션이 잘못된 저장소에서 누락되지 않는다.

### Login Flow

로그인 버튼 클릭 시:

1. 체크박스 상태를 읽는다.
2. `아이디 기억`이 켜져 있으면 이메일을 `localStorage`에 저장하고, 아니면 제거한다.
3. `자동로그인` 상태를 `localStorage`에 저장한다.
4. 그 뒤 `signInWithPassword()`를 호출한다.
5. Supabase는 현재 adapter가 가리키는 저장소에 세션을 기록한다.

### Logout Flow

로그아웃 버튼 클릭 시:

1. `supabase.auth.signOut()` 호출
2. `autoLoginEnabled` 제거 또는 `false`로 갱신
3. 세션 저장소(`localStorage`, `sessionStorage`)에 남아 있을 수 있는 auth 키 정리
4. `rememberedLoginEmail`은 그대로 유지

이렇게 하면 로그아웃 직후에는 자동 복원이 막히지만, 이메일은 계속 남는다.

## Expected UX

- 사용자가 `아이디 기억`만 체크한 경우
  - 다음 방문 시 이메일이 미리 입력되어 있음
  - 로그인 버튼은 다시 눌러야 함
- 사용자가 `자동로그인`까지 체크한 경우
  - 다음 방문 시 바로 앱 진입
- 사용자가 로그아웃한 경우
  - 자동로그인은 꺼짐
  - 이메일만 남음

## Edge Cases

### Multi-tab Behavior

- `localStorage` 기반 자동로그인은 탭 간 공유된다.
- `sessionStorage` 기반 로그인은 탭별로 독립적이다.
- 따라서 `자동로그인 = OFF` 상태에서는 새 탭에서 로그인 상태가 공유되지 않는다.

이건 의도된 트레이드오프다. 요구사항은 브라우저/탭 종료 후 재로그인을 요구하고 있고, `sessionStorage`는 그 조건을 가장 단순하고 예측 가능하게 만족한다.

### Browser Restore Behavior

일부 브라우저는 "이전 세션 복원" 기능이 있지만, `sessionStorage`는 일반적으로 탭 수명에 묶인다. 앱은 브라우저 종료 자체를 감지하려 하지 않고, 저장소 수명 모델에 기대어 동작한다.

### SSR Compatibility

현재 앱은 Vite 기반 클라이언트 앱이지만, 이후 SSR 환경으로 옮기면 `window` 접근에 가드가 필요하다. 이번 설계에서는 storage helper를 브라우저 전용 경계 안에 두어 추후 대응 가능하게 만든다.

## Files Likely To Change

- `lib/supabase.ts`
  - Supabase client 초기화와 storage adapter 연결
- `hooks/useAuthStatus.ts`
  - 초기 세션 복원 순서 검토
- `Auth.tsx`
  - `아이디 기억`, `자동로그인` 체크박스 및 로그인 처리
- 새 helper 파일
  - 로그인 preference와 storage adapter 관리

## Verification

최소 검증 시나리오:

1. `자동로그인 OFF`, `아이디 기억 OFF`
   - 로그인 후 새로고침: 유지
   - 탭 종료 후 재접속: 로그인 필요
2. `자동로그인 OFF`, `아이디 기억 ON`
   - 탭 종료 후 재접속: 이메일만 남고 로그인 필요
3. `자동로그인 ON`
   - 브라우저 재접속: 자동 진입
4. 로그아웃
   - 재접속: 자동진입 안 됨
   - 이메일 기억이 켜져 있던 경우 이메일은 유지
