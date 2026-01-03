import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import {
    sendOtp,
    detectNetwork,
    getNetworkName,
    getNetworkColor,
} from '@/services/authService';

export default function PhoneLogin() {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [network, setNetwork] = useState<string | null>(null);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPhone(value);
        setError(null);
        
        // Auto-detect network
        if (value.length >= 3) {
            const detected = detectNetwork(value);
            setNetwork(detected);
        } else {
            setNetwork(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await sendOtp(phone);
            
            // Store phone in session for OTP verification page
            sessionStorage.setItem('otp_phone', phone);
            sessionStorage.setItem('otp_expires_at', response.expires_at);
            
            // Redirect to OTP verification
            router.visit('/auth/otp-verify', {
                method: 'get',
            });
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Enter your phone number"
            description="We'll send you a verification code"
        >
            <Head title="Login" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                +233
                            </span>
                            <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={handlePhoneChange}
                                placeholder="XX XXX XXXX"
                                required
                                autoFocus
                                className="pl-12"
                                disabled={loading}
                            />
                        </div>
                        {network && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Network:</span>
                                <span
                                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white ${getNetworkColor(network)}`}
                                >
                                    {getNetworkName(network)}
                                </span>
                            </div>
                        )}
                        <InputError message={error || undefined} />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || !phone}
                    >
                        {loading && <Spinner />}
                        Continue
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}

