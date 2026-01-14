import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'success' | 'destructive';
    onClose?: () => void;
}

export function Toast({ id, title, description, variant = 'default', onClose }: ToastProps) {
    const variants = {
        default: 'bg-background border',
        success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        destructive: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    };

    const textVariants = {
        default: 'text-foreground',
        success: 'text-green-800 dark:text-green-200',
        destructive: 'text-red-800 dark:text-red-200',
    };

    return (
        <div
            className={cn(
                'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
                variants[variant]
            )}
        >
            <div className="grid gap-1">
                {title && (
                    <div className={cn('text-sm font-semibold', textVariants[variant])}>
                        {title}
                    </div>
                )}
                {description && (
                    <div className={cn('text-sm opacity-90', textVariants[variant])}>
                        {description}
                    </div>
                )}
            </div>
            {onClose && (
                <button
                    className={cn(
                        'absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2',
                        textVariants[variant]
                    )}
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

export interface ToastContextType {
    toasts: ToastProps[];
    addToast: (toast: Omit<ToastProps, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastProps[]>([]);

    const addToast = React.useCallback((toast: Omit<ToastProps, 'id'>) => {
        const id = Math.random().toString(36).substring(7);
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <div className="pointer-events-none fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-auto sm:right-0 sm:top-0 sm:flex-col md:max-w-[420px]">
                <div className="pointer-events-auto flex flex-col gap-2">
                    {toasts.map((toast) => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onClose={() => removeToast(toast.id)}
                        />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

