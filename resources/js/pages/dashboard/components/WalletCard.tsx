import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface WalletCardProps {
    balance: number | string;
    totalFunded: number | string;
    totalSpent: number | string;
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const startValue = 0;
        const endValue = value;
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (endValue - startValue) * easeOut;

            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
            }
        };

        animate();
    }, [value, duration]);

    return <>{displayValue.toFixed(2)}</>;
}

export default function WalletCard({
    balance,
    totalFunded,
    totalSpent,
}: WalletCardProps) {
    const balanceNum = Number(balance);
    const fundedNum = Number(totalFunded);
    const spentNum = Number(totalSpent);

    return (
        <Card className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] animate-scale-in">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Wallet className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
                    Wallet Balance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="animate-slide-down">
                        <p className="text-sm opacity-90 mb-1">Available Balance</p>
                        <p className="text-3xl font-bold">
                            GHS <AnimatedNumber value={balanceNum} />
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        <div>
                            <p className="text-xs opacity-75 mb-1">Total Funded</p>
                            <p className="text-lg font-semibold">
                                GHS <AnimatedNumber value={fundedNum} />
                            </p>
                        </div>
                        <div>
                            <p className="text-xs opacity-75 mb-1">Total Spent</p>
                            <p className="text-lg font-semibold">
                                GHS <AnimatedNumber value={spentNum} />
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.visit('/wallet')}
                        className="w-full bg-white text-blue-600 hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                        Fund Wallet
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

