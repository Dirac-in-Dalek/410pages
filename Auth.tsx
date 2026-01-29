import React, { useState } from 'react';
import { supabase } from './lib/supabase';

export const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [emailCheckResult, setEmailCheckResult] = useState<{ available: boolean; message: string } | null>(null);

    const checkEmailAvailability = async () => {
        if (!email || !email.includes('@')) {
            setError("유효한 이메일을 입력해주세요.");
            return;
        }
        setLoading(true);
        setError(null);
        setEmailCheckResult(null);
        try {
            // Use RPC to check email existence (Server-side check)
            const { data: exists, error: rpcError } = await supabase.rpc('check_email_exists', {
                email_to_check: email
            });

            if (rpcError) throw rpcError;

            if (exists) {
                setEmailCheckResult({ available: false, message: "이미 사용 중인 이메일입니다." });
            } else {
                setEmailCheckResult({ available: true, message: "사용 가능한 이메일입니다." });
            }
        } catch (err: any) {
            console.error("Email check error:", err);
            setError(`중복 확인 실패: ${err.message || '알 수 없는 오류'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                if (emailCheckResult && !emailCheckResult.available) {
                    throw new Error("이미 사용 중인 이메일입니다.");
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username,
                        },
                    },
                });
                if (error) throw error;
                setIsSuccess(true);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans">
                <div className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-sm rounded-xl text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">이메일을 확인해주세요</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        <span className="font-semibold text-indigo-600">{email}</span> 주소로 인증 메일을 보냈습니다.<br />
                        메일함의 링크를 클릭하여 가입을 완료해주세요.
                    </p>
                    <button
                        onClick={() => {
                            setIsSuccess(false);
                            setIsSignUp(false);
                        }}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                        로그인 화면으로 돌아가기
                    </button>
                    <p className="mt-4 text-xs text-slate-400">
                        메일을 받지 못하셨나요? 스팸 메일함을 확인해보세요.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans">
            <div className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-col items-center mb-10">
                    <div className="text-slate-900 mb-4">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 6 L12 3 H18 V18 L13 21 H7 V6" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tighter text-slate-900 mb-2 font-serif">
                        410pages
                    </h1>
                    <p className="text-slate-500 text-sm italic font-serif opacity-80">
                        {isSignUp ? 'Start your knowledge journey today.' : 'Welcome back to your second brain.'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4 font-sans">
                    {isSignUp && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required={isSignUp}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                placeholder="How should we call you?"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailCheckResult(null);
                                }}
                                required
                                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${isSignUp && emailCheckResult ? (emailCheckResult.available ? 'border-emerald-300' : 'border-red-300') : 'border-slate-300'
                                    }`}
                                placeholder="name@example.com"
                            />
                            {isSignUp && (
                                <button
                                    type="button"
                                    onClick={checkEmailAvailability}
                                    className="px-3 py-2 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors whitespace-nowrap"
                                >
                                    중복 확인
                                </button>
                            )}
                        </div>
                        {isSignUp && emailCheckResult && (
                            <p className={`text-[11px] mt-1 ${emailCheckResult.available ? 'text-emerald-600' : 'text-red-600'}`}>
                                {emailCheckResult.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 text-xs text-red-600 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || (isSignUp && (!emailCheckResult || !emailCheckResult.available))}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isSignUp && !emailCheckResult ? "먼저 이메일 중복 확인을 해주세요." : ""}
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-500 font-sans">
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                            setEmailCheckResult(null);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                </div>
            </div>
        </div>
    );
};
