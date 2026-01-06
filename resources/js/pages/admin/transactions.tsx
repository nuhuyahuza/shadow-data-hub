import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import DataTable, { type ColumnDef } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, CheckCircle2, XCircle, Clock, Eye, RefreshCw } from 'lucide-react';
import TransactionDetailsModal from '@/components/admin/TransactionDetailsModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Transactions',
        href: '/admin/transactions',
    },
];

interface Transaction extends Record<string, unknown> {
    id: number;
    reference: string;
    user?: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    package?: {
        id: number;
        name: string;
        network: string;
        data_size: string;
        price: number | string;
    };
    type: string;
    amount: number | string;
    status: string;
    network?: string;
    phone_number?: string;
    vendor_reference?: string;
    vendor_response?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export default function AdminTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    useEffect(() => {
        const fetchAllTransactions = async () => {
            try {
                let page = 1;
                let allData: Transaction[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/admin/transactions?per_page=100&page=${page}`, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to load transactions');
                    }

                    const data = await response.json();
                    const pageData = data.data || data;
                    allData = [...allData, ...(Array.isArray(pageData) ? pageData : [])];

                    // Check if there are more pages
                    if (data.last_page && page < data.last_page) {
                        page++;
                    } else {
                        hasMore = false;
                    }
                }

                setTransactions(allData);
                setLoading(false);
            } catch (err) {
                console.error('Error loading transactions:', err);
                setLoading(false);
            }
        };

        fetchAllTransactions();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return (
                    <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </Badge>
                );
            case 'refunded':
                return (
                    <Badge variant="default" className="bg-blue-500">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refunded
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getNetworkBadge = (network?: string) => {
        if (!network) return <span className="text-muted-foreground">N/A</span>;
        const colors: Record<string, string> = {
            mtn: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
            telecel: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            airteltigo: 'bg-red-500/10 text-red-600 dark:text-red-400',
        };
        return (
            <Badge className={colors[network] || ''}>
                {network.charAt(0).toUpperCase() + network.slice(1)}
            </Badge>
        );
    };

    const columns: ColumnDef<Transaction>[] = [
        {
            key: 'reference',
            header: 'Reference',
            accessor: (row) => (
                <span className="font-mono text-sm">{row.reference}</span>
            ),
            sortable: true,
        },
        {
            key: 'user',
            header: 'User',
            accessor: (row) => (
                <div>
                    <div className="font-medium">{row.user?.name || 'Guest'}</div>
                    {row.user?.email && (
                        <div className="text-xs text-muted-foreground">{row.user.email}</div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            key: 'package',
            header: 'Package',
            accessor: (row) => (
                <div>
                    {row.package ? (
                        <>
                            <div className="font-medium">{row.package.name}</div>
                            <div className="text-xs text-muted-foreground">
                                {getNetworkBadge(row.package.network)}
                            </div>
                        </>
                    ) : (
                        <span className="text-muted-foreground">N/A</span>
                    )}
                </div>
            ),
        },
        {
            key: 'phone_number',
            header: 'Phone',
            accessor: (row) => (
                <span className="text-sm">{row.phone_number || 'N/A'}</span>
            ),
        },
        {
            key: 'amount',
            header: 'Amount',
            accessor: (row) => (
                <span className="font-medium">GHS {Number(row.amount).toFixed(2)}</span>
            ),
            sortable: true,
        },
        {
            key: 'status',
            header: 'Status',
            accessor: (row) => getStatusBadge(row.status),
            sortable: true,
        },
        {
            key: 'created_at',
            header: 'Date',
            accessor: (row) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                </span>
            ),
            sortable: true,
        },
    ];

    const handleViewDetails = async (transaction: Transaction) => {
        try {
            const response = await fetch(`/api/admin/transactions/${transaction.id}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedTransaction(data);
                setIsDetailsModalOpen(true);
            }
        } catch (error) {
            console.error('Error fetching transaction details:', error);
        }
    };

    const handleStatusUpdateInModal = async (transactionId: number, newStatus: string) => {
        const response = await fetch(`/api/admin/transactions/${transactionId}/status`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update status');
        }

        setTransactions((prev) =>
            prev.map((t) =>
                t.id === transactionId ? { ...t, status: newStatus } : t
            )
        );
        // Update the selected transaction
        if (selectedTransaction && selectedTransaction.id === transactionId) {
            setSelectedTransaction({ ...selectedTransaction, status: newStatus });
        }
    };

    const handleRefund = async (transactionId: number) => {
        const response = await fetch(`/api/admin/transactions/${transactionId}/refund`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to process refund');
        }

        // Update the transaction in the local state to refunded
        setTransactions((prev) =>
            prev.map((t) => (t.id === transactionId ? { ...t, status: 'refunded' } : t))
        );
        
        // Update selected transaction if it's the one being refunded
        if (selectedTransaction && selectedTransaction.id === transactionId) {
            setSelectedTransaction({ ...selectedTransaction, status: 'refunded' });
        }
    };

    const actions = (row: Transaction) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewDetails(row)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                </DropdownMenuItem>
                {row.status === 'failed' && (
                    <DropdownMenuItem>
                        <XCircle className="h-4 w-4 mr-2" />
                        Refund
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transactions" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <DataTable
                    data={transactions}
                    columns={columns}
                    searchable
                    searchPlaceholder="Search by reference, user, or phone..."
                    searchKeys={['reference', 'user.name', 'user.email', 'phone_number']}
                    pagination
                    pageSize={15}
                    actions={actions}
                    loading={loading}
                    emptyMessage="No transactions found"
                    title="Transactions"
                    titleIcon={<History className="h-5 w-5" />}
                />
            </div>
            <TransactionDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedTransaction(null);
                }}
                transaction={selectedTransaction}
                onStatusUpdate={handleStatusUpdateInModal}
                onRefund={handleRefund}
                apiPrefix="admin"
            />
        </AppLayout>
    );
}

