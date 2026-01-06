import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import DataTable, { type ColumnDef } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Packages',
        href: '/agent/packages',
    },
];

interface DataPackage extends Record<string, unknown> {
    id: number;
    network: string;
    name: string;
    data_size: string;
    price: number | string;
    vendor_price: number | string;
    validity: string;
    is_active: boolean;
    created_at: string;
}

export default function AgentPackages() {
    const [packages, setPackages] = useState<DataPackage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllPackages = async () => {
            try {
                let page = 1;
                let allData: DataPackage[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/agent/packages?per_page=100&page=${page}`, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to load packages');
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

                setPackages(allData);
                setLoading(false);
            } catch (err) {
                console.error('Error loading packages:', err);
                setLoading(false);
            }
        };

        fetchAllPackages();
    }, []);

    const getNetworkBadge = (network: string) => {
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

    const columns: ColumnDef<DataPackage>[] = [
        {
            key: 'name',
            header: 'Package Name',
            accessor: (row) => (
                <div>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.data_size}</div>
                </div>
            ),
            sortable: true,
        },
        {
            key: 'network',
            header: 'Network',
            accessor: (row) => getNetworkBadge(row.network),
            sortable: true,
        },
        {
            key: 'price',
            header: 'Price',
            accessor: (row) => (
                <span className="font-medium">GHS {Number(row.price).toFixed(2)}</span>
            ),
            sortable: true,
        },
        {
            key: 'vendor_price',
            header: 'Vendor Price',
            accessor: (row) => (
                <span className="text-sm text-muted-foreground">
                    GHS {Number(row.vendor_price).toFixed(2)}
                </span>
            ),
            sortable: true,
        },
        {
            key: 'validity',
            header: 'Validity',
            accessor: (row) => <span className="text-sm">{row.validity}</span>,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Packages" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <DataTable
                    data={packages}
                    columns={columns}
                    searchable
                    searchPlaceholder="Search by package name..."
                    searchKeys={['name', 'network']}
                    pagination
                    pageSize={15}
                    loading={loading}
                    emptyMessage="No packages found"
                    title="Data Packages"
                    titleIcon={<Package className="h-5 w-5" />}
                />
            </div>
        </AppLayout>
    );
}

