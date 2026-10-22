import type { ComponentProps } from 'react';

export type ButtonProps = ComponentProps<'button'> & {
  variant?: 'default' | 'ghost' | 'solid';
  size?: 'default' | 'icon';
};

/** Shared focus, disabled, typography and interaction styles live in ui-btn. */
export function Button({
  variant = 'default',
  size = 'default',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'ui-btn',
        variant === 'default' ? '' : `ui-btn--${variant}`,
        size === 'icon' ? 'ui-btn-icon' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
