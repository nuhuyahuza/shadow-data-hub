import { useState, useEffect } from 'react';
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
import { Wifi } from 'lucide-react';

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

    // Animate network badge appearance
    useEffect(() => {
        if (network) {
            // Trigger animation
        }
    }, [network]);

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
                        <Label htmlFor="phone" className="animate-fade-in">Phone Number</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
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
                                className="pl-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                disabled={loading}
                            />
                        </div>
                        {network && (
                            <div className="flex items-center gap-2 text-sm animate-slide-down">
                                <Wifi className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Network:</span>
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm transition-all duration-300 ${getNetworkColor(network)} animate-scale-in`}
                                >
                                    {getNetworkName(network)}
                                </span>
                            </div>
                        )}
                        {error && (
                            <div className="animate-slide-down">
                                <InputError message={error} />
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading || !phone}
                    >
                        {loading && <Spinner />}
                        {loading ? 'Sending...' : 'Continue'}
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}

