import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Wallet, Plus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Wallet',
        href: '/wallet',
    },
];

interface WalletProps {
    wallet: {
        balance: number | string;
        total_funded: number | string;
        total_spent: number | string;
    };
}

export default function WalletPage({ wallet }: WalletProps) {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');

    const handleFund = () => {
        // TODO: Implement fund wallet API call
        router.post('/api/wallet/fund', {
            amount: parseFloat(amount),
            payment_method: paymentMethod,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Wallet" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Wallet className="h-5 w-5" />
                            Wallet Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm opacity-90">Current Balance</p>
                                <p className="text-4xl font-bold">
                                    GHS {Number(wallet.balance).toFixed(2)}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                                <div>
                                    <p className="text-xs opacity-75">Total Funded</p>
                                    <p className="text-xl font-semibold">
                                        GHS {Number(wallet.total_funded).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs opacity-75">Total Spent</p>
                                    <p className="text-xl font-semibold">
                                        GHS {Number(wallet.total_spent).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Fund Wallet
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount (GHS)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min="1"
                                    max="10000"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="payment_method">Payment Method</Label>
                                <Select
                                    value={paymentMethod}
                                    onValueChange={setPaymentMethod}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mtn_momo">MTN Mobile Money</SelectItem>
                                        <SelectItem value="telecel_cash">Telecel Cash</SelectItem>
                                        <SelectItem value="airteltigo_money">
                                            AirtelTigo Money
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleFund}
                                className="w-full"
                                disabled={!amount || !paymentMethod}
                            >
                                Fund Wallet
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

