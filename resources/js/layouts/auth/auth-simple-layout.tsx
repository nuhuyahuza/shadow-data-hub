import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-gradient-to-br from-background via-background to-muted/20 p-6 md:p-10 overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 opacity-30 dark:opacity-20">
                <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative w-full max-w-sm z-10">
                <div className="flex flex-col gap-8 animate-scale-in">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium transition-transform duration-200 hover:scale-105"
                        >
                            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200 hover:rotate-12">
                                <AppLogoIcon className="size-9 fill-current text-[var(--foreground)] dark:text-white" />
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center animate-slide-down">
                            <h1 className="text-xl font-medium">{title}</h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card/50 backdrop-blur-md p-6 shadow-lg animate-slide-up">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
