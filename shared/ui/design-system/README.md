# 410pages proposal kit

Import the named exports from `shared/ui/design-system`. Wrap each proposal in
`<DesignSystem variant="A" mode="light">` (variants `A`, `B`, `C`; modes
`light`, `dark`). One component implementation consumes each proposal's tokens.
The scope emits `data-ds` and `data-mode`; components must remain descendants of
that scope, including dialogs. These files do not change existing product screens.

```tsx
import { DesignSystem, Panel, Field, ActionButton, Choice } from './shared/ui/design-system';

<DesignSystem variant="A" mode="light">
  <Panel title="새 책 추가" description="읽고 있는 책을 서재에 추가하세요.">
    <form onSubmit={saveBook}>
      <Field label="책 제목" name="title" required />
      <Choice label="개인 서재에만 보관" defaultChecked />
      <ActionButton type="submit" variant="primary">추가하기</ActionButton>
    </form>
  </Panel>
</DesignSystem>
```

All controls accept their corresponding native React attributes and events,
including controlled values, disabled/required states, names, and refs. Buttons
default to `type="button"`; explicitly choose `submit` for form submission.

| Export | Added props | Native element |
| --- | --- | --- |
| `DesignSystem` | `variant: A/B/C`, `mode?: light/dark` | div |
| `ActionButton` | `variant?: primary/secondary/ghost/danger`, `loading?`, `pressed?` | existing shared Button |
| `IconButton` | ActionButton props plus required `label: string` | existing shared Button |
| `Field`, `SearchField` | `label: string`, `hint?`, `error?` | input |
| `MemoField` | `label: string`, `hint?`, `error?` | textarea |
| `SelectField` | `label: string`, `hint?`, `error?`; pass native option children | select |
| `Choice` | `label: ReactNode`, `hint?`, `kind?: checkbox/radio/switch` | input in label |
| `Panel` | `title?`, `description?`, `actions?` | section |
| `Notice` | `tone?: info/success/danger`, `title?` | div, status/alert |
| `Dialog` | `open`, `onClose`, `title`, `description?`, `footer?` | dialog |
| `ActionMenu` | `label: string`; children may be buttons or links | details/summary |
| `CitationRow` | `quote`, `source?`, `meta?`, `actions?` | article |
| `BookCard` | `title`, `author?`, `meta?`, `cover?`, `actions?` | article |
| `ChapterRow` | `title`, `meta?`, `selected?` | existing shared Button |
| `BrandWordmark` | `compact?` | span |

The Dialog uses native modal behavior for focus containment, Escape, and focus
return. Keep `onClose` synchronized with the controlled `open` state. ActionMenu
is a native disclosure containing normal buttons/links, not an ARIA menu widget:
use Tab to navigate its actions. Escape and action selection close the disclosure
and return focus to its summary. Native details does not dismiss on outside click.
Field descriptions merge caller-provided `aria-describedby` with generated hint
and error IDs. Choice supports standard radio grouping through `name`.

Tokens owned by `tokens.css`: `--ds-bg`, `--ds-surface`, `--ds-alt`, `--ds-text`,
`--ds-muted`, `--ds-line`, `--ds-control-border`, `--ds-primary`, `--ds-hover`,
`--ds-on-primary`, `--ds-soft`, `--ds-danger`, `--ds-on-danger`, `--ds-success`, `--ds-focus`,
`--ds-height`, `--ds-radius`, `--ds-panel-radius`, `--ds-gap`, `--ds-icon`,
`--ds-pad`, `--ds-shadow`, `--ds-reader-font`, `--ds-reader-size`.

Inputs retain a 50px minimum height, 6px corners, and 13px labels. Content wraps
instead of forcing fixed control heights. Row actions wrap and icon targets are
at least 44px. CSS selectors stay beneath `[data-ds]` so product styles remain
outside this proposal's scope. `BrandWordmark` reuses the existing product SVG;
`compact` reduces its size while preserving its original lettering.

## 상태와 크기 / States and sizing

사용자가 선택한 테마의 토큰을 실제 컴포넌트가 직접 소비합니다. `--ds-pad`는
패널·책·문장 행의 여백, `--ds-gap`은 그 안의 요소 간격을 조절합니다. 버튼의
좌우 여백과 글자 크기는 `--ds-button-pad-x`, `--ds-button-font`로 바꿉니다.
읽기 본문에는 `--ds-reader-font`, `--ds-reader-size`, `--ds-reader-line`이 적용됩니다.

| 상태 | 동작과 표시 |
| --- | --- |
| 기본 / default | 버튼은 목적에 맞는 primary/secondary/ghost/danger를 명시합니다. |
| hover | 포인터를 올리면 배경이 바뀝니다. disabled 버튼에는 적용하지 않습니다. |
| active | 누르는 동안 버튼이 1px 이동합니다. 동작 실행 여부는 native click 이벤트가 결정합니다. |
| selected | 토글 버튼은 `pressed`, 목차 행은 `selected`, 선택 입력은 `checked`를 사용합니다. ARIA 상태와 시각 표시가 함께 바뀝니다. |
| disabled | native `disabled`를 사용해 입력과 실행을 막고 흐리게 표시합니다. |
| busy | `loading`은 `aria-busy`와 진행 표시를 제공하고 중복 실행을 막습니다. 기존 버튼 이름을 유지합니다. |
| focus | 키보드 포커스는 테마의 focus 색과 바깥 윤곽선으로 표시합니다. |
| error | `error`는 필드 테두리·안내문·`aria-invalid`와 설명 연결을 함께 제공합니다. |

입력은 최소 50px(기본 글자 크기 기준), 라벨은 13px, 모서리는 6px입니다.
브라우저 글자 확대에는 rem 토큰이 함께 커지며, 줄바꿈으로 버튼과 행의 높이가
늘어납니다. 1024px 미만 또는 coarse pointer 환경의 버튼·목차·메뉴 트리거는
최소 44px이고, 아이콘 버튼은 모든 환경에서 최소 44×44px입니다. 모바일에서
임의의 고정 높이로 두 줄 글자를 잘라내지 않습니다.
터치 조건에서도 기존 테마 높이를 줄이지 않으므로 C의 48px 버튼은 유지됩니다.
B 데스크톱의 한 줄 버튼은 40px이며 글자가 여러 줄이면 자연스럽게 늘어납니다.
danger 버튼의 글자색은 `--ds-on-danger`로 밝고 어두운 테마 각각 지정합니다.
대화상자는 native `close` 이벤트에서만 `onClose`를 알리므로 닫기 버튼과
부모의 `open=false` 동기화가 콜백을 중복 호출하지 않습니다.
