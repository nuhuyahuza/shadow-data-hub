import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import { UserCheck, Key } from 'lucide-react';

export default function AgentTwoFactorChallenge() {
    const [code, setCode] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{
        code?: string;
        recovery_code?: string;
    }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const response = await fetch('/auth/agent/two-factor-challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'include',
                body: JSON.stringify({
                    code: useRecoveryCode ? null : code,
                    recovery_code: useRecoveryCode ? recoveryCode : null,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ code: data.message || 'Invalid code' });
                }
                setLoading(false);
                return;
            }

            const data = await response.json();

            // Redirect to agent transactions
            router.visit(data.redirect || '/agent/transactions');
        } catch (error) {
            console.error('2FA verification error:', error);
            setErrors({ code: 'An unexpected error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Two-Factor Authentication"
            description="Enter your authentication code to continue"
        >
            <Head title="Two-Factor Authentication" />

            <div className="flex items-center justify-center gap-2 mb-4">
                <UserCheck className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Agent Access</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-6">
                    {!useRecoveryCode ? (
                        <>
                            <div className="grid gap-2 animate-fade-in">
                                <Label htmlFor="code">Authentication Code</Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors duration-200" />
                                    <Input
                                        id="code"
                                        type="text"
                                        value={code}
                                        onChange={(e) => {
                                            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                            setErrors({ ...errors, code: undefined });
                                        }}
                                        placeholder="000000"
                                        required
                                        autoFocus
                                        className="pl-10 text-center text-2xl tracking-widest transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                        disabled={loading}
                                        maxLength={6}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Enter the 6-digit code from your authenticator app
                                </p>
                                {errors.code && (
                                    <div className="animate-slide-down">
                                        <InputError message={errors.code} />
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setUseRecoveryCode(true)}
                                className="text-sm text-primary hover:underline text-left transition-all duration-200 hover:scale-105"
                            >
                                Use a recovery code instead
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="grid gap-2 animate-slide-down">
                                <Label htmlFor="recovery_code">Recovery Code</Label>
                                <Input
                                    id="recovery_code"
                                    type="text"
                                    value={recoveryCode}
                                    onChange={(e) => {
                                        setRecoveryCode(e.target.value);
                                        setErrors({ ...errors, recovery_code: undefined });
                                    }}
                                    placeholder="Enter recovery code"
                                    required
                                    autoFocus
                                    disabled={loading}
                                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter one of your recovery codes to access your account
                                </p>
                                {errors.recovery_code && (
                                    <div className="animate-slide-down">
                                        <InputError message={errors.recovery_code} />
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setUseRecoveryCode(false);
                                    setRecoveryCode('');
                                }}
                                className="text-sm text-primary hover:underline text-left transition-all duration-200 hover:scale-105"
                            >
                                Use authentication code instead
                            </button>
                        </>
                    )}

                    <Button
                        type="submit"
                        className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading || (!useRecoveryCode && code.length !== 6) || (useRecoveryCode && !recoveryCode)}
                    >
                        {loading && <Spinner />}
                        {loading ? 'Verifying...' : 'Verify'}
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}

