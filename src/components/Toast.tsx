
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 10000, onClose }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300); // Wait for fade out
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const colors = {
        success: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400',
        error: 'bg-rose-500/10 border-rose-500/50 text-rose-400',
        info: 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
    };

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-circle-exclamation',
        info: 'fa-circle-info'
    };

    if (!visible) return null;

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-right-10 duration-300 ${colors[type]} mb-2`}>
            <i className={`fa-solid ${icons[type]}`}></i>
            <span className="text-sm font-bold">{message}</span>
        </div>
    );
};

// Singleton to manage toast rendering
class ToastManager {
    private container: HTMLElement | null = null;
    private root: any = null;
    private toasts: Array<{ id: string, message: string, type: 'success' | 'error' | 'info' }> = [];

    constructor() {
        if (typeof window !== 'undefined') {
            this.container = document.createElement('div');
            this.container.style.position = 'fixed';
            this.container.style.bottom = '20px';
            this.container.style.right = '20px';
            this.container.style.zIndex = '9999';
            this.container.style.display = 'flex';
            this.container.style.flexDirection = 'column';
            this.container.style.alignItems = 'flex-end';
            document.body.appendChild(this.container);
            this.root = createRoot(this.container);
        }
    }

    show(message: string, type: 'success' | 'error' | 'info' = 'info') {
        const id = Date.now().toString();
        this.toasts.push({ id, message, type });
        this.render();
    }

    remove(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.render();
    }

    render() {
        if (!this.root) return;
        this.root.render(
            <>
                {this.toasts.map(t => (
                    <Toast
                        key={t.id}
                        message={t.message}
                        type={t.type}
                        onClose={() => this.remove(t.id)}
                    />
                ))}
            </>
        );
    }
}

export const toast = new ToastManager();
