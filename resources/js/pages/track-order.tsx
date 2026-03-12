import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import AuthLayout from '@/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, ArrowLeft } from 'lucide-react';

interface OrderData {
    reference: string;
    status: string;
    amount: number | string;
    network: string;
    phone_number: string;
    created_at: string;
    package_name?: string;
    package_data_size?: string;
    store_name?: string;
}

interface TrackOrderProps {
    order: OrderData | null;
    error: string | null;
    searched: boolean;
}

export default function TrackOrder({ order, error, searched }: TrackOrderProps) {
    const [reference, setReference] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const params: Record<string, string> = { reference };
        if (phone.trim()) params.phone = phone.trim();
        router.get('/track-order', params);
    };

    const statusLabel: Record<string, string> = {
        pending_fulfillment: 'Pending',
        fulfilled: 'Fulfilled',
        failed_delivery: 'Delivery failed',
    };

    return (
        <AuthLayout
            title="Track your order"
            description="Enter your order reference to check status"
        >
            <Head title="Track Order" />
            <div className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reference">Order / Transaction reference</Label>
                        <Input
                            id="reference"
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. TXNXXXXXXXX"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone number (optional)</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone used for the order"
                        />
                    </div>
                    <Button type="submit">Track order</Button>
                </form>

                {searched && error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {searched && order && (
                    <div className="rounded-lg border bg-card p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <h2 className="font-semibold">Order details</h2>
                        </div>
                        <dl className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Reference</span>
                                <span className="font-mono">{order.reference}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span>{statusLabel[order.status] ?? order.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount</span>
                                <span>GHS {Number(order.amount).toFixed(2)}</span>
                            </div>
                            {order.package_name && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Package</span>
                                    <span>{order.package_name} {order.package_data_size ? `(${order.package_data_size})` : ''}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Network</span>
                                <span className="capitalize">{order.network}</span>
                            </div>
                            {order.store_name && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Store</span>
                                    <span>{order.store_name}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date</span>
                                <span>{new Date(order.created_at).toLocaleString()}</span>
                            </div>
                        </dl>
                    </div>
                )}

                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>
            </div>
        </AuthLayout>
    );
}
