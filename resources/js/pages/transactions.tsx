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
                        <div className="mb-4 flex gap-2 flex-wrap">
                            {['all', 'success', 'failed', 'pending', 'cancelled'].map((f, index) => (
                                <button
                                    key={f}
                                    onClick={() => {
                                        setFilter(f);
                                        setLoading(true);
                                    }}
                                    className={`px-3 py-1 rounded text-sm transition-all duration-200 hover:scale-105 ${
                                        filter === f
                                            ? 'bg-primary text-primary-foreground shadow-md'
                                            : 'bg-muted hover:bg-muted/80'
                                    } animate-fade-in`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        {loading ? (
                            <div className="text-center py-8 animate-fade-in">
                                <div className="inline-block h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                                <p className="text-muted-foreground">Loading transactions...</p>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-8 animate-fade-in">
                                <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                                <p className="text-muted-foreground">No transactions found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {transactions.map((transaction, index) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between border-b pb-3 transition-all duration-200 hover:bg-muted/50 hover:px-2 hover:-mx-2 rounded-md cursor-pointer animate-slide-up"
                                        style={{ animationDelay: `${index * 30}ms` }}
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
                                                    )} text-white transition-all duration-200`}
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

