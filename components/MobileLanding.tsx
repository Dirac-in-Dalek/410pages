import React from 'react';

export const MobileLanding = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-serif">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl">📱</span>
            </div>
            <h1 className="text-2xl font-medium text-slate-900 mb-3">
                Desktop Experience Only
            </h1>
            <p className="text-slate-500 leading-relaxed max-w-xs font-sans text-sm">
                Sentences is designed for deep work and organization on a larger screen.
                <br /><br />
                Please check back on your computer.
            </p>
        </div>
    );
};
