import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import DataTable, { type ColumnDef } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CheckCircle2, XCircle, Clock, Eye, Ban } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal } from 'lucide-react';
import TransactionDetailsModal from '@/components/admin/TransactionDetailsModal';
import { useToast } from '@/components/ui/toast';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Purchases',
        href: '/agent/purchases',
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
    };
    type: string;
    amount: number | string;
    status: string;
    network?: string;
    phone_number?: string;
    created_at: string;
}

export default function AgentPurchases() {
    const { addToast } = useToast();
    const [purchases, setPurchases] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    useEffect(() => {
        const fetchAllPurchases = async () => {
            try {
                let page = 1;
                let allData: Transaction[] = [];
                let hasMore = true;

                while (hasMore) {
                    const url = statusFilter === 'all'
                        ? `/api/agent/transactions?type=purchase&per_page=100&page=${page}`
                        : `/api/agent/transactions?type=purchase&status=${statusFilter}&per_page=100&page=${page}`;

                    const response = await fetch(url, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to load purchases');
                    }

                    const data = await response.json();
                    const pageData = data.data || data;
                    allData = [...allData, ...(Array.isArray(pageData) ? pageData : [])];

                    if (data.last_page && page < data.last_page) {
                        page++;
                    } else {
                        hasMore = false;
                    }
                }

                setPurchases(allData);
                setLoading(false);
            } catch (err) {
                console.error('Error loading purchases:', err);
                setLoading(false);
            }
        };

        fetchAllPurchases();
    }, [statusFilter]);

    const handleStatusUpdate = async (transactionId: number, newStatus: string) => {
        try {
            const response = await fetch(`/api/agent/transactions/${transactionId}/status`, {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setPurchases((prev) =>
                    prev.map((t) =>
                        t.id === transactionId ? { ...t, status: newStatus } : t
                    )
                );
                addToast({
                    title: 'Status Updated',
                    description: `Purchase status has been updated to ${newStatus}`,
                    variant: 'success',
                });
            } else {
                const errorData = await response.json();
                addToast({
                    title: 'Update Failed',
                    description: errorData.message || 'Failed to update purchase status',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error updating purchase status:', error);
            addToast({
                title: 'Update Failed',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        }
    };

    const handleViewDetails = async (transaction: Transaction) => {
        try {
            const response = await fetch(`/api/agent/transactions/${transaction.id}`, {
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
        await handleStatusUpdate(transactionId, newStatus);
        // Refresh the transaction details after update
        const updatedTransaction = purchases.find((t) => t.id === transactionId);
        if (updatedTransaction) {
            setSelectedTransaction({ ...updatedTransaction, status: newStatus });
        }
    };

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
            case 'cancelled':
                return (
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-600 dark:text-gray-400">
                        <Ban className="h-3 w-3 mr-1" />
                        Cancelled
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
                <DropdownMenuItem
                    onClick={() => handleStatusUpdate(row.id, 'success')}
                    disabled={row.status === 'success'}
                >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Complete
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleStatusUpdate(row.id, 'failed')}
                    disabled={row.status === 'failed'}
                >
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Failed
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleStatusUpdate(row.id, 'cancelled')}
                    disabled={row.status === 'cancelled'}
                >
                    <Ban className="h-4 w-4 mr-2" />
                    Mark as Cancelled
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleStatusUpdate(row.id, 'pending')}
                    disabled={row.status === 'pending'}
                >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark as Pending
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchases" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Purchase Management</h1>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DataTable
                    data={purchases}
                    columns={columns}
                    searchable
                    searchPlaceholder="Search by reference, user, or phone..."
                    searchKeys={['reference', 'user.name', 'user.email', 'phone_number']}
                    pagination
                    pageSize={15}
                    actions={actions}
                    loading={loading}
                    emptyMessage="No purchases found"
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
                apiPrefix="agent"
            />
        </AppLayout>
    );
}

