import {
  useEffect,
  useId,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button } from "../Button";
import { BrandWordmark as ProductWordmark } from "../BrandWordmark";
import "./tokens.css";
import "./components.css";

type Native<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T>;
type FieldCopy = { label: string; hint?: ReactNode; error?: ReactNode };
const classes = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(" ");

export function DesignSystem({
  variant,
  mode = "light",
  className,
  ...props
}: Native<"div"> & { variant: "A" | "B" | "C"; mode?: "light" | "dark" }) {
  return (
    <div
      {...props}
      data-ds={variant}
      data-mode={mode}
      className={classes("ds-root", className)}
    />
  );
}

export type ActionButtonProps = Omit<Native<"button">, "aria-pressed"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  pressed?: boolean;
};
export function ActionButton({
  variant = "secondary",
  loading = false,
  pressed,
  disabled,
  children,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={pressed}
      className={classes("ds-button", `ds-button--${variant}`, className)}
    >
      {loading && <span className="ds-spinner" aria-hidden="true" />}
      {children}
    </Button>
  );
}
export function IconButton({
  label,
  children,
  className,
  ...props
}: ActionButtonProps & { label: string }) {
  return (
    <ActionButton
      {...props}
      className={classes("ds-icon-button", className)}
      aria-label={label}
      title={props.title ?? label}
    >
      {children}
    </ActionButton>
  );
}

function FieldFrame({
  id,
  label,
  hint,
  error,
  children,
}: FieldCopy & { id: string; children: ReactNode }) {
  return (
    <div className="ds-field">
      <label className="ds-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && (
        <div className="ds-hint" id={`${id}-hint`}>
          {hint}
        </div>
      )}
      {error && (
        <div className="ds-error" id={`${id}-error`}>
          {error}
        </div>
      )}
    </div>
  );
}
const describedBy = (
  id: string,
  hint: ReactNode,
  error: ReactNode,
  supplied?: string,
) =>
  [supplied, hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ") || undefined;

export function Field({
  label,
  hint,
  error,
  id: supplied,
  className,
  ...props
}: FieldCopy & Native<"input">) {
  const generated = useId();
  const id = supplied ?? generated;
  return (
    <FieldFrame {...{ id, label, hint, error }}>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        className={classes("ds-input", className)}
      />
    </FieldFrame>
  );
}
export function SearchField(props: FieldCopy & Native<"input">) {
  return <Field {...props} type="search" />;
}
export function MemoField({
  label,
  hint,
  error,
  id: supplied,
  className,
  ...props
}: FieldCopy & Native<"textarea">) {
  const generated = useId();
  const id = supplied ?? generated;
  return (
    <FieldFrame {...{ id, label, hint, error }}>
      <textarea
        {...props}
        id={id}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        className={classes("ds-input", "ds-textarea", className)}
      />
    </FieldFrame>
  );
}
export function SelectField({
  label,
  hint,
  error,
  id: supplied,
  className,
  children,
  ...props
}: FieldCopy & Native<"select">) {
  const generated = useId();
  const id = supplied ?? generated;
  return (
    <FieldFrame {...{ id, label, hint, error }}>
      <select
        {...props}
        id={id}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy(
          id,
          hint,
          error,
          props["aria-describedby"],
        )}
        className={classes("ds-input", className)}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: Omit<Native<"section">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section {...props} className={classes("ds-panel", className)}>
      {(title || description || actions) && (
        <header className="ds-panel-header">
          <div>
            {title && <h2 className="ds-panel-title">{title}</h2>}
            {description && <p className="ds-hint">{description}</p>}
          </div>
          {actions && <div className="ds-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
export function Notice({
  tone = "info",
  title,
  children,
  className,
  ...props
}: Omit<Native<"div">, "title"> & {
  tone?: "info" | "success" | "danger";
  title?: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      {...props}
      className={classes("ds-notice", `ds-notice--${tone}`, className)}
    >
      {title && <strong>{title}</strong>}
      {children && <div>{children}</div>}
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  className,
  ...props
}: Omit<Native<"dialog">, "open" | "title" | "onClose"> & {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      {...props}
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onClose={onClose}
      className={classes("ds-dialog", className)}
    >
      <header className="ds-panel-header">
        <div>
          <h2 id={`${id}-title`} className="ds-panel-title">
            {title}
          </h2>
          {description && (
            <p id={`${id}-description`} className="ds-hint">
              {description}
            </p>
          )}
        </div>
        <IconButton
          label="대화상자 닫기"
          variant="ghost"
          onClick={() => ref.current?.close()}
        >
          ×
        </IconButton>
      </header>
      <div className="ds-dialog-body">{children}</div>
      {footer && <footer className="ds-dialog-footer">{footer}</footer>}
    </dialog>
  );
}

export function Choice({
  kind = "checkbox",
  label,
  hint,
  className,
  id: supplied,
  ...props
}: Omit<Native<"input">, "type"> & {
  kind?: "checkbox" | "radio" | "switch";
  label: ReactNode;
  hint?: ReactNode;
}) {
  const generated = useId();
  const id = supplied ?? generated;
  return (
    <label htmlFor={id} className={classes("ds-choice", className)}>
      <input
        {...props}
        id={id}
        type={kind === "radio" ? "radio" : "checkbox"}
        role={kind === "switch" ? "switch" : undefined}
        aria-describedby={describedBy(
          id,
          hint,
          undefined,
          props["aria-describedby"],
        )}
        className={classes("ds-choice-input", kind === "switch" && "ds-switch")}
      />
      <span>
        <span className="ds-choice-label">{label}</span>
        {hint && (
          <span id={`${id}-hint`} className="ds-hint ds-choice-hint">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

export function CitationRow({
  quote,
  source,
  meta,
  actions,
  className,
  ...props
}: Native<"article"> & {
  quote: ReactNode;
  source?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article {...props} className={classes("ds-citation", className)}>
      <div className="ds-citation-main">
        <blockquote>{quote}</blockquote>
        {source && <div className="ds-citation-source">{source}</div>}
        {meta && <div className="ds-hint">{meta}</div>}
      </div>
      {actions && <div className="ds-actions">{actions}</div>}
    </article>
  );
}
export function BookCard({
  title,
  author,
  meta,
  cover,
  actions,
  className,
  ...props
}: Omit<Native<"article">, "title"> & {
  title: ReactNode;
  author?: ReactNode;
  meta?: ReactNode;
  cover?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article {...props} className={classes("ds-book", className)}>
      {cover && <div className="ds-book-cover">{cover}</div>}
      <div className="ds-book-copy">
        <h3>{title}</h3>
        {author && <p>{author}</p>}
        {meta && <div className="ds-hint">{meta}</div>}
        {actions && <div className="ds-actions">{actions}</div>}
      </div>
    </article>
  );
}
export function ChapterRow({
  title,
  meta,
  selected,
  className,
  ...props
}: Omit<Native<"button">, "title"> & {
  title: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
}) {
  return (
    <Button
      {...props}
      aria-current={selected ? "page" : undefined}
      className={classes("ds-chapter", className)}
    >
      <span>{title}</span>
      {meta && <span className="ds-hint">{meta}</span>}
    </Button>
  );
}
export function BrandWordmark({
  compact = false,
  className,
  ...props
}: Native<"span"> & { compact?: boolean }) {
  return (
    <span
      {...props}
      className={classes(
        "ds-wordmark",
        compact && "ds-wordmark--compact",
        className,
      )}
    >
      <ProductWordmark />
    </span>
  );
}
export function ActionMenu({
  label,
  children,
  className,
  onKeyDown,
  onClick,
  ...props
}: Native<"details"> & { label: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (ref.current) {
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    }
  };
  return (
    <details
      {...props}
      ref={ref}
      className={classes("ds-menu", className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          event.key === "Escape" &&
          ref.current?.open
        ) {
          event.preventDefault();
          close();
        }
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !(event.target instanceof Element))
          return;
        const action = event.target.closest("button:not(:disabled), a[href]");
        if (action && ref.current?.contains(action)) close();
      }}
    >
      <summary>
        {label}
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="ds-menu-items">{children}</div>
    </details>
  );
}
