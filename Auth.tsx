import React, { useEffect, useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import {
    clearRememberedEmail,
    readAutoLoginEnabled,
    readRememberedEmail,
    setAutoLoginEnabled,
    setRememberedEmail,
} from './lib/authStorage';
import { getSupabaseClient } from './lib/supabase';

const AUTH_SCREEN_CLASS =
    'font-size-static flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg-main)] px-4 py-6 font-sans sm:px-6 sm:py-8';
const AUTH_CARD_CLASS =
    'w-full max-w-md rounded-2xl bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] sm:p-8';
const AUTH_INPUT_CLASS =
    'min-h-11 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 text-[var(--text-main)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-muted)] focus-visible:border-[var(--accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]';
const AUTH_PRIMARY_BUTTON_CLASS =
    'inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-[var(--accent-strong)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';

type AuthMode = 'login' | 'signup' | 'forgot';
type AuthSuccess = 'signup' | 'reset-email' | 'password-updated' | null;

type AuthProps = {
    isPasswordRecovery?: boolean;
    onPasswordRecoveryComplete?: () => void;
};

export const getAuthErrorMessage = (error: unknown): string => {
    const message = error instanceof Error ? error.message : String(error || '');
    const normalized = message.toLocaleLowerCase();

    if (normalized.includes('failed to fetch') || normalized.includes('fetch failed') || normalized.includes('network')) {
        return '서버에 연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.';
    }
    if (normalized.includes('invalid login credentials')) {
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    if (normalized.includes('email not confirmed')) {
        return '이메일 인증이 필요합니다. 받은편지함의 인증 링크를 확인해주세요.';
    }
    if (normalized.includes('password') && (normalized.includes('weak') || normalized.includes('short'))) {
        return '더 안전한 비밀번호를 입력해주세요.';
    }
    if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
    }

    return message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
};

export const Auth: React.FC<AuthProps> = ({
    isPasswordRecovery = false,
    onPasswordRecoveryComplete,
}) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [username, setUsername] = useState('');
    const [mode, setMode] = useState<AuthMode>('login');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<AuthSuccess>(null);
    const [rememberEmail, setRememberEmailState] = useState(false);
    const [autoLogin, setAutoLogin] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const storedEmail = readRememberedEmail();

        if (storedEmail) {
            setEmail(storedEmail);
            setRememberEmailState(true);
        }

        setAutoLogin(readAutoLoginEnabled());
    }, []);

    const resetFeedback = () => {
        setError(null);
        setSuccess(null);
    };

    const switchMode = (nextMode: AuthMode) => {
        setMode(nextMode);
        setPassword('');
        setPasswordConfirm('');
        setShowPassword(false);
        resetFeedback();
    };

    const handleAuth = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        resetFeedback();
        let previousAutoLogin = autoLogin;

        try {
            const supabase = getSupabaseClient();

            if (mode === 'signup') {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username } },
                });
                if (signUpError?.message.toLocaleLowerCase().includes('user already registered')) {
                    setSuccess('signup');
                    return;
                }
                if (signUpError) throw signUpError;
                setSuccess('signup');
                return;
            }

            previousAutoLogin = readAutoLoginEnabled();
            setAutoLoginEnabled(autoLogin);

            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw signInError;

            if (rememberEmail) setRememberedEmail(email);
            else clearRememberedEmail();
        } catch (authError) {
            if (mode === 'login') setAutoLoginEnabled(previousAutoLogin);
            setError(getAuthErrorMessage(authError));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordResetRequest = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        resetFeedback();

        try {
            const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/`,
            });
            if (resetError) throw resetError;
            setSuccess('reset-email');
        } catch (authError) {
            setError(getAuthErrorMessage(authError));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordRecovery = async (event: React.FormEvent) => {
        event.preventDefault();
        resetFeedback();

        if (password !== passwordConfirm) {
            setError('두 비밀번호가 일치하지 않습니다.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
            if (updateError) throw updateError;
            setSuccess('password-updated');
        } catch (authError) {
            setError(getAuthErrorMessage(authError));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        const isSignupSuccess = success === 'signup';
        const isResetEmailSuccess = success === 'reset-email';
        const heading = isSignupSuccess
            ? '이메일을 확인해주세요'
            : isResetEmailSuccess
              ? '재설정 메일을 보냈습니다'
              : '비밀번호를 변경했습니다';
        const description = isSignupSuccess
            ? `${email} 주소로 인증 메일을 보냈습니다.`
            : isResetEmailSuccess
              ? `${email} 주소로 비밀번호 재설정 링크를 보냈습니다.`
              : '새 비밀번호로 계속 이용할 수 있습니다.';

        return (
            <div className={AUTH_SCREEN_CLASS}>
                <section className={`${AUTH_CARD_CLASS} text-center`} aria-live="polite">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                        <Check size={28} aria-hidden="true" />
                    </div>
                    <h1 className="mb-3 text-2xl font-bold tracking-[-0.012em] text-[var(--text-main)]">{heading}</h1>
                    <p className="mb-7 text-sm leading-relaxed text-[var(--text-muted)]">
                        {description}<br />
                        {isResetEmailSuccess ? '메일의 링크를 열어 변경을 완료해주세요.' : null}
                        {isSignupSuccess ? '메일의 인증 링크를 열어 가입을 완료해주세요.' : null}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            if (success === 'password-updated') onPasswordRecoveryComplete?.();
                            else switchMode('login');
                        }}
                        className={AUTH_PRIMARY_BUTTON_CLASS}
                    >
                        {success === 'password-updated' ? '410pages로 돌아가기' : '로그인 화면으로 돌아가기'}
                    </button>
                    {success !== 'password-updated' ? (
                        <p className="mt-4 text-xs text-[var(--text-muted)]">메일이 보이지 않으면 스팸함을 확인해주세요.</p>
                    ) : null}
                </section>
            </div>
        );
    }

    const title = isPasswordRecovery ? '새 비밀번호 설정' : mode === 'signup' ? '계정 만들기' : mode === 'forgot' ? '비밀번호 찾기' : 'La Biblioteca de Babel';
    const subtitle = isPasswordRecovery
        ? '앞으로 사용할 새 비밀번호를 입력하세요.'
        : mode === 'signup'
          ? '읽고 남긴 문장을 한곳에 모아보세요.'
          : mode === 'forgot'
            ? '가입한 이메일로 재설정 링크를 보내드립니다.'
            : '이런 방식으로 당신은 스물세 글자의 변형체들을 볼 수 있을 것이다.';

    return (
        <div className={AUTH_SCREEN_CLASS}>
            <section className={AUTH_CARD_CLASS} aria-labelledby="auth-title">
                <div className="mb-8 flex flex-col items-center sm:mb-9">
                    <div className="mb-3 text-[var(--text-main)]" aria-hidden="true">
                        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 6 L12 3 H18 V18 L13 21 H7 V6" />
                        </svg>
                    </div>
                    <div className="brand-wordmark mb-5 text-3xl font-semibold text-[var(--text-main)]">
                        <span className="brand-number">410</span><span className="brand-text">pages</span>
                    </div>
                    <h1 id="auth-title" className="text-balance text-xl font-semibold tracking-[-0.012em] text-[var(--text-main)]">{title}</h1>
                    <p className="mt-1.5 text-center text-sm text-[var(--text-muted)]">{subtitle}</p>
                </div>

                {isPasswordRecovery ? (
                    <form onSubmit={handlePasswordRecovery} className="space-y-4">
                        <PasswordField
                            id="new-password"
                            label="새 비밀번호"
                            value={password}
                            showPassword={showPassword}
                            onShowPasswordChange={setShowPassword}
                            onChange={setPassword}
                            autoComplete="new-password"
                        />
                        <div>
                            <label htmlFor="new-password-confirm" className="mb-1.5 block text-xs font-semibold text-[var(--text-main)]">새 비밀번호 확인</label>
                            <input
                                id="new-password-confirm"
                                type={showPassword ? 'text' : 'password'}
                                value={passwordConfirm}
                                onChange={(event) => setPasswordConfirm(event.target.value)}
                                required
                                autoComplete="new-password"
                                className={AUTH_INPUT_CLASS}
                                placeholder="비밀번호를 한 번 더 입력하세요"
                            />
                        </div>
                        <AuthAlert message={error} />
                        <button type="submit" disabled={loading} className={AUTH_PRIMARY_BUTTON_CLASS}>
                            {loading ? '변경 중…' : '비밀번호 변경'}
                        </button>
                    </form>
                ) : mode === 'forgot' ? (
                    <form onSubmit={handlePasswordResetRequest} className="space-y-4">
                        <EmailField email={email} onChange={setEmail} />
                        <AuthAlert message={error} />
                        <button type="submit" disabled={loading} className={AUTH_PRIMARY_BUTTON_CLASS}>
                            {loading ? '보내는 중…' : '재설정 메일 보내기'}
                        </button>
                        <button type="button" onClick={() => switchMode('login')} className="min-h-11 w-full rounded-lg text-sm font-medium text-[var(--text-muted)] transition-[color,transform] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none">
                            로그인으로 돌아가기
                        </button>
                    </form>
                ) : (
                    <>
                        <form onSubmit={handleAuth} className="space-y-4">
                            {mode === 'signup' ? (
                                <div>
                                    <label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-[var(--text-main)]">이름</label>
                                    <input id="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} required className={AUTH_INPUT_CLASS} placeholder="어떻게 불러드릴까요?" />
                                </div>
                            ) : null}

                            <div>
                                <EmailField email={email} onChange={setEmail} />
                            </div>

                            <PasswordField
                                id="password"
                                label="비밀번호"
                                value={password}
                                showPassword={showPassword}
                                onShowPasswordChange={setShowPassword}
                                onChange={setPassword}
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            />

                            {mode === 'login' ? (
                                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
                                    <AuthCheckbox label="아이디 기억" checked={rememberEmail} onChange={setRememberEmailState} />
                                    <AuthCheckbox label="자동 로그인" checked={autoLogin} onChange={setAutoLogin} />
                                </div>
                            ) : null}

                            <AuthAlert message={error} />

                            <div className="space-y-1">
                                <button type="submit" disabled={loading} className={AUTH_PRIMARY_BUTTON_CLASS}>
                                    {loading ? '처리 중…' : mode === 'signup' ? '계정 만들기' : '로그인'}
                                </button>

                                {mode === 'login' ? (
                                    <div className="flex min-h-11 items-center justify-center gap-1 text-sm">
                                        <button type="button" onClick={() => switchMode('forgot')} className="min-h-11 rounded-lg px-2 font-medium text-[var(--text-muted)] transition-[color,transform] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none">
                                            비밀번호 찾기
                                        </button>
                                        <span aria-hidden="true" className="text-[var(--border-main)]">·</span>
                                        <button type="button" onClick={() => switchMode('signup')} className="min-h-11 rounded-lg px-2 font-semibold text-[var(--accent)] transition-[color,transform] hover:text-[var(--accent-strong)] active:scale-95 motion-reduce:transition-none">
                                            가입하기
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </form>

                        {mode === 'signup' ? (
                            <div className="mt-5 text-center text-sm text-[var(--text-muted)]">
                                이미 계정이 있나요?{' '}
                                <button type="button" onClick={() => switchMode('login')} className="min-h-11 rounded-lg px-2 font-semibold text-[var(--accent)] transition-[color,transform] hover:text-[var(--accent-strong)] active:scale-95 motion-reduce:transition-none">
                                    로그인
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </section>
        </div>
    );
};

const EmailField: React.FC<{ email: string; onChange: (value: string) => void }> = ({ email, onChange }) => (
    <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-[var(--text-main)]">이메일</label>
        <input id="email" type="email" value={email} onChange={(event) => onChange(event.target.value)} required autoComplete="username" className={AUTH_INPUT_CLASS} placeholder="name@example.com" />
    </div>
);

const PasswordField: React.FC<{
    id: string;
    label: string;
    value: string;
    showPassword: boolean;
    onShowPasswordChange: (value: boolean) => void;
    onChange: (value: string) => void;
    autoComplete: string;
}> = ({ id, label, value, showPassword, onShowPasswordChange, onChange, autoComplete }) => (
    <div>
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[var(--text-main)]">{label}</label>
        <div className="relative">
            <input id={id} type={showPassword ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} required autoComplete={autoComplete} className={`${AUTH_INPUT_CLASS} pr-12`} placeholder="비밀번호를 입력하세요" />
            <button type="button" onClick={() => onShowPasswordChange(!showPassword)} className="absolute inset-y-0 right-0 inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-[var(--text-muted)] transition-[color,transform] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>
);

const AuthCheckbox: React.FC<{ label: string; checked: boolean; onChange: (value: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="relative flex min-h-8 cursor-pointer touch-manipulation select-none items-center gap-2 rounded-lg px-2 transition-[background-color,transform] before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] hover:bg-[var(--sidebar-hover)] active:scale-95 motion-reduce:transition-none">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-[var(--border-main)] text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]" />
        <span>{label}</span>
    </label>
);

const AuthAlert: React.FC<{ message: string | null }> = ({ message }) =>
    message ? (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-relaxed text-red-800 dark:bg-red-400/10 dark:text-red-100">
            {message}
        </div>
    ) : null;
