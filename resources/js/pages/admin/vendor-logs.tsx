import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import DataTable, { type ColumnDef } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Vendor Logs',
        href: '/admin/vendor-logs',
    },
];

interface VendorLog extends Record<string, unknown> {
    id: number;
    transaction_id: number | null;
    endpoint: string;
    method: string;
    request_body: string | null;
    response_body: string | null;
    status_code: number | null;
    created_at: string;
    transaction?: {
        id: number;
        reference: string;
    };
}

export default function AdminVendorLogs() {
    const [logs, setLogs] = useState<VendorLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllLogs = async () => {
            try {
                let page = 1;
                let allData: VendorLog[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/admin/vendor-logs?per_page=100&page=${page}`, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to load vendor logs');
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

                setLogs(allData);
                setLoading(false);
            } catch (err) {
                console.error('Error loading vendor logs:', err);
                setLoading(false);
            }
        };

        fetchAllLogs();
    }, []);

    const getStatusBadge = (statusCode: number | null) => {
        if (!statusCode) {
            return <Badge variant="outline">N/A</Badge>;
        }
        if (statusCode >= 200 && statusCode < 300) {
            return (
                <Badge variant="default" className="bg-green-500">
                    {statusCode}
                </Badge>
            );
        }
        if (statusCode >= 400 && statusCode < 500) {
            return (
                <Badge variant="destructive">
                    {statusCode}
                </Badge>
            );
        }
        return (
            <Badge variant="secondary">
                {statusCode}
            </Badge>
        );
    };

    const columns: ColumnDef<VendorLog>[] = [
        {
            key: 'transaction',
            header: 'Transaction',
            accessor: (row) => (
                <div>
                    {row.transaction ? (
                        <span className="font-mono text-sm">{row.transaction.reference}</span>
                    ) : (
                        <span className="text-muted-foreground">N/A</span>
                    )}
                </div>
            ),
        },
        {
            key: 'endpoint',
            header: 'Endpoint',
            accessor: (row) => (
                <div>
                    <div className="font-medium">{row.method}</div>
                    <div className="text-xs text-muted-foreground font-mono">{row.endpoint}</div>
                </div>
            ),
            sortable: true,
        },
        {
            key: 'status_code',
            header: 'Status',
            accessor: (row) => getStatusBadge(row.status_code),
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vendor Logs" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Vendor Logs</h1>
                </div>
                <DataTable
                    data={logs}
                    columns={columns}
                    searchable
                    searchPlaceholder="Search by endpoint or transaction reference..."
                    searchKeys={['endpoint', 'transaction.reference']}
                    pagination
                    pageSize={15}
                    loading={loading}
                    emptyMessage="No vendor logs found"
                />
            </div>
        </AppLayout>
    );
}

