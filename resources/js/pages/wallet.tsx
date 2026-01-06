import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus } from 'lucide-react';
import WalletFundingModal from '@/components/wallet-funding-modal';
import { getWallet } from '@/services/walletService';

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

export default function WalletPage({ wallet: initialWallet }: WalletProps) {
    const [wallet, setWallet] = useState(initialWallet);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSuccess = async () => {
        // Refresh wallet balance after successful funding
        try {
            const updatedWallet = await getWallet();
            setWallet(updatedWallet);
        } catch (error) {
            console.error('Failed to refresh wallet:', error);
        }
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
                            <p className="text-sm text-muted-foreground">
                                Add funds to your wallet using Paystack. You can pay with card or
                                mobile money.
                            </p>
                            <Button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Fund Wallet
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <WalletFundingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            </div>
        </AppLayout>
    );
}

