
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface UndoContextType {
    showUndo: (message: string, onUndo: () => Promise<void> | void, duration?: number) => void;
    confirmDelete: (message: string, onConfirm: () => Promise<void> | void) => void;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

export const useUndo = () => {
    const context = useContext(UndoContext);
    if (!context) {
        throw new Error('useUndo must be used within an UndoProvider');
    }
    return context;
};

export const UndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; onUndo: () => void; id: number } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showUndo = useCallback((message: string, onUndo: () => Promise<void> | void, duration = 10000) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const id = Date.now();
        setToast({
            message,
            onUndo: async () => {
                await onUndo();
                setToast(null);
            },
            id
        });

        // Set new timeout to auto-dismiss
        timeoutRef.current = setTimeout(() => {
            setToast(null);
        }, duration);
    }, []);

    const confirmDelete = useCallback((message: string, onConfirm: () => Promise<void> | void) => {
        // Replace native confirm with custom modal
        setConfirmModal({
            message,
            onConfirm: async () => {
                await onConfirm();
                setConfirmModal(null);
            }
        });
    }, []);

    return (
        <UndoContext.Provider value={{ showUndo, confirmDelete }}>
            {children}

            {/* UNDO TOAST */}
            {toast && createPortal(
                <div className="fixed bottom-8 left-8 z-[100] flex items-center gap-4 bg-[#151A25] border border-slate-700 p-4 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-4 slide-in-from-left-4 duration-300 min-w-[300px]">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <i className="fa-solid fa-trash-can-arrow-up"></i>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Item Deleted</p>
                            <p className="text-xs text-slate-500">{toast.message}</p>
                        </div>
                    </div>
                    <button
                        onClick={toast.onUndo}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <i className="fa-solid fa-rotate-left"></i> Revert
                    </button>
                    <button
                        onClick={() => setToast(null)}
                        className="h-6 w-6 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                    <div
                        key={toast.id} // restart animation on new toast
                        className="absolute bottom-0 left-0 h-0.5 bg-indigo-500 animate-[width_10s_linear_forwards]"
                        style={{ width: '100%' }}
                    ></div>
                </div>,
                document.body
            )}

            {/* HELL THEME DELETION MODAL */}
            {confirmModal && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    {/* Backdrop with blur and red tint */}
                    <div
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setConfirmModal(null)}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15),transparent_70%)]"></div>
                    </div>

                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-[#0f0a0a] border border-red-900/50 rounded-2xl p-8 shadow-[0_0_60px_rgba(220,38,38,0.3)] animate-in zoom-in-95 duration-200 overflow-hidden group">

                        {/* Ambient Fire/Smoke Animation (CSS simulation) */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-900/20 to-transparent pointer-events-none"></div>
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-600/20 blur-[60px] rounded-full pointer-events-none"></div>
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-orange-600/20 blur-[60px] rounded-full pointer-events-none"></div>

                        <div className="relative z-10 text-center">
                            {/* Icon */}
                            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_20px_rgba(220,38,38,0.2)] animate-pulse">
                                <i className="fa-solid fa-skull text-3xl text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"></i>
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wide font-serif" style={{ textShadow: '0 0 20px rgba(220,38,38,0.6)' }}>
                                Delete for Eternity?
                            </h2>

                            {/* Message */}
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed font-mono">
                                {confirmModal.message}
                                <br />
                                <span className="text-red-400/70 text-xs mt-2 block italic">The void hungers... and there is no return (mostly).</span>
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="px-6 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 hover:text-white transition-all uppercase tracking-wider"
                                >
                                    Spare It
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 border border-red-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] uppercase tracking-wider flex items-center gap-2 group/btn"
                                >
                                    <span>Incinerate</span>
                                    <i className="fa-solid fa-fire text-orange-300 group-hover/btn:animate-bounce"></i>
                                </button>
                            </div>
                        </div>

                        {/* Glitch Border */}
                        <div className="absolute inset-0 border border-red-500/10 rounded-2xl pointer-events-none"></div>
                    </div>
                </div>,
                document.body
            )}
        </UndoContext.Provider>
    );
};
