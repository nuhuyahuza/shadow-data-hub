import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import { Shield } from 'lucide-react';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{
        email?: string;
        password?: string;
    }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const response = await fetch('/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    password,
                    remember,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ email: data.message || 'Invalid credentials' });
                }
                return;
            }

            // Check if 2FA is required
            if (data.two_factor) {
                router.visit(data.redirect || '/auth/admin/two-factor-challenge');
            } else {
                // Redirect to admin dashboard
                router.visit(data.redirect || '/admin/dashboard');
            }
        } catch (err) {
            setErrors({ email: 'An unexpected error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Admin Login"
            description="Enter your credentials to access the admin panel"
        >
            <Head title="Admin Login" />

            <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Secure Admin Access</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-6">
                    <div className="grid gap-2 animate-fade-in">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setErrors({ ...errors, email: undefined });
                            }}
                            placeholder="admin@example.com"
                            required
                            autoFocus
                            disabled={loading}
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        {errors.email && (
                            <div className="animate-slide-down">
                                <InputError message={errors.email} />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2 animate-fade-in" style={{ animationDelay: '50ms' }}>
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setErrors({ ...errors, password: undefined });
                            }}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                        {errors.password && (
                            <div className="animate-slide-down">
                                <InputError message={errors.password} />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        <input
                            id="remember"
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-all duration-200 cursor-pointer"
                            disabled={loading}
                        />
                        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                            Remember me
                        </Label>
                    </div>

                    <Button
                        type="submit"
                        className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading || !email || !password}
                    >
                        {loading && <Spinner />}
                        {loading ? 'Logging in...' : 'Login'}
                    </Button>
                </div>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>Regular users should use{' '}
                    <a href="/auth/phone-login" className="text-primary hover:underline">
                        phone login
                    </a>
                </p>
            </div>
        </AuthLayout>
    );
}

