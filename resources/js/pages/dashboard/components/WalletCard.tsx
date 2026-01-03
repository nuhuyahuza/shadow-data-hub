import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { router } from '@inertiajs/react';

interface WalletCardProps {
    balance: number;
    totalFunded: number;
    totalSpent: number;
}

export default function WalletCard({
    balance,
    totalFunded,
    totalSpent,
}: WalletCardProps) {
    return (
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Wallet className="h-5 w-5" />
                    Wallet Balance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm opacity-90">Available Balance</p>
                        <p className="text-3xl font-bold">
                            GHS {balance.toFixed(2)}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                        <div>
                            <p className="text-xs opacity-75">Total Funded</p>
                            <p className="text-lg font-semibold">
                                GHS {totalFunded.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs opacity-75">Total Spent</p>
                            <p className="text-lg font-semibold">
                                GHS {totalSpent.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.visit('/wallet')}
                        className="w-full bg-white text-blue-600 hover:bg-gray-100"
                    >
                        Fund Wallet
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

