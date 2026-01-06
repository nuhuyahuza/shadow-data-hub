import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Transactions',
        href: '/transactions',
    },
];

interface Transaction {
    id: number;
    reference: string;
    type: string;
    network: string | null;
    phone_number: string | null;
    amount: number | string;
    status: string;
    created_at: string;
    package?: {
        id: number;
        name: string;
        network: string;
        data_size: string;
    } | null;
}

export default function Transactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        const url =
            filter === 'all'
                ? '/api/transactions'
                : `/api/transactions?status=${filter}`;
        fetch(url, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                // Handle paginated response
                if (data.data && Array.isArray(data.data)) {
                    setTransactions(data.data);
                } else if (Array.isArray(data)) {
                    setTransactions(data);
                } else {
                    setTransactions([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error loading transactions:', err);
                setTransactions([]);
                setLoading(false);
            });
    }, [filter]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            case 'pending':
                return 'bg-yellow-500';
            case 'cancelled':
                return 'bg-gray-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transactions" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Transaction History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex gap-2">
                            {['all', 'success', 'failed', 'pending', 'cancelled'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => {
                                        setFilter(f);
                                        setLoading(true);
                                    }}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${
                                        filter === f
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
                                    }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        {loading ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Loading transactions...</p>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No transactions found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {transactions.map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between border-b pb-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {transaction.package?.name ||
                                                        transaction.type.charAt(0).toUpperCase() +
                                                            transaction.type.slice(1)}
                                                </span>
                                                <Badge
                                                    className={`${getStatusColor(
                                                        transaction.status
                                                    )} text-white`}
                                                >
                                                    {transaction.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {transaction.reference} •{' '}
                                                {new Date(
                                                    transaction.created_at
                                                ).toLocaleString()}
                                            </p>
                                            {transaction.package && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {transaction.package.data_size}
                                                    {transaction.network && ` • ${transaction.network.toUpperCase()}`}
                                                </p>
                                            )}
                                        </div>
                                        <span className="font-semibold">
                                            GHS {Number(transaction.amount).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

