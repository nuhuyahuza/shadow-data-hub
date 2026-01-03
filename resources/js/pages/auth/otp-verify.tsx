import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { verifyOtp, formatPhoneForDisplay } from '@/services/authService';

export default function OtpVerify() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [canResend, setCanResend] = useState(false);
    const [phone, setPhone] = useState<string>('');

    useEffect(() => {
        // Get phone from session storage
        const storedPhone = sessionStorage.getItem('otp_phone');
        const expiresAt = sessionStorage.getItem('otp_expires_at');

        if (!storedPhone) {
            // Redirect back to phone login if no phone in session
            router.visit('/auth/phone-login');
            return;
        }

        setPhone(storedPhone);

        if (expiresAt) {
            const expiry = new Date(expiresAt).getTime();
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
            setTimeLeft(remaining);

            if (remaining > 0) {
                const timer = setInterval(() => {
                    setTimeLeft((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            setCanResend(true);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

                return () => clearInterval(timer);
            } else {
                setCanResend(true);
            }
        }
    }, []);

    const handleVerify = async () => {
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            await verifyOtp(phone, code);
            
            // Clear session storage
            sessionStorage.removeItem('otp_phone');
            sessionStorage.removeItem('otp_expires_at');
            
            // Redirect to dashboard
            router.visit('/dashboard', {
                method: 'get',
            });
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to verify OTP. Please try again.');
            }
            setCode(''); // Clear code on error
        } finally {
            setLoading(false);
        }
    };

    const handleResend = () => {
        // Redirect back to phone login to resend
        router.visit('/auth/phone-login', {
            method: 'get',
            data: { phone },
        });
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <AuthLayout
            title="Enter verification code"
            description={`We sent a code to ${formatPhoneForDisplay(phone)}`}
        >
            <Head title="Verify OTP" />

            <div className="flex flex-col gap-6">
                <div className="grid gap-4">
                    <div className="flex justify-center">
                        <InputOTP
                            maxLength={6}
                            value={code}
                            onChange={setCode}
                            disabled={loading}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <InputError message={error || undefined} />

                    {timeLeft > 0 && (
                        <p className="text-center text-sm text-muted-foreground">
                            Code expires in {formatTime(timeLeft)}
                        </p>
                    )}

                    <Button
                        onClick={handleVerify}
                        className="w-full"
                        disabled={loading || code.length !== 6}
                    >
                        {loading && <Spinner />}
                        Verify
                    </Button>
                </div>

                <div className="text-center">
                    {canResend ? (
                        <Button
                            variant="ghost"
                            onClick={handleResend}
                            className="text-sm"
                            disabled={loading}
                        >
                            Resend code
                        </Button>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Resend code in {formatTime(timeLeft)}
                        </p>
                    )}
                </div>
            </div>
        </AuthLayout>
    );
}

