import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

interface Transaction {
    id: number;
    reference: string;
    type: string;
    network: string | null;
    package_name: string | null;
    phone_number: string | null;
    amount: number;
    status: string;
    created_at: string;
}

interface RecentTransactionsProps {
    transactions: Transaction[];
}

export default function RecentTransactions({
    transactions,
}: RecentTransactionsProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            case 'pending':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getNetworkName = (network: string | null) => {
        if (!network) return 'N/A';
        const names: Record<string, string> = {
            mtn: 'MTN',
            telecel: 'Telecel',
            airteltigo: 'AirtelTigo',
        };
        return names[network] || network;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Recent Transactions
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.visit('/transactions')}
                    >
                        View All
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No transactions yet
                    </p>
                ) : (
                    <div className="space-y-4">
                        {transactions.map((transaction) => (
                            <div
                                key={transaction.id}
                                className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm">
                                            {transaction.package_name ||
                                                transaction.type}
                                        </p>
                                        <Badge
                                            className={`${getStatusColor(
                                                transaction.status
                                            )} text-white text-xs`}
                                        >
                                            {transaction.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        {transaction.network && (
                                            <span>
                                                {getNetworkName(
                                                    transaction.network
                                                )}
                                            </span>
                                        )}
                                        {transaction.phone_number && (
                                            <span>• {transaction.phone_number}</span>
                                        )}
                                        <span>
                                            • {new Date(
                                                transaction.created_at
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">
                                        GHS {transaction.amount.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {transaction.reference.slice(-8)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

