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
    package_name: string | null;
    phone_number: string | null;
    amount: number | string;
    status: string;
    created_at: string;
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
        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                setTransactions(data.data || data);
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
                            {['all', 'success', 'failed', 'pending'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => {
                                        setFilter(f);
                                        setLoading(true);
                                    }}
                                    className={`px-3 py-1 rounded text-sm ${
                                        filter === f
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        {loading ? (
                            <p>Loading transactions...</p>
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
                                                    {transaction.package_name ||
                                                        transaction.type}
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

