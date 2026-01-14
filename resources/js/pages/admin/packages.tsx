import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import DataTable, { type ColumnDef } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Plus, CheckCircle2, XCircle } from 'lucide-react';
import CreatePackageModal from '@/components/admin/CreatePackageModal';
import { useToast } from '@/components/ui/toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Packages',
        href: '/admin/packages',
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

export default function AdminPackages() {
    const { addToast } = useToast();
    const [packages, setPackages] = useState<DataPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        const fetchAllPackages = async () => {
            try {
                let page = 1;
                let allData: DataPackage[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/admin/packages?per_page=100&page=${page}`, {
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

    const handleToggleActive = async (packageId: number, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/admin/packages/${packageId}`, {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'include',
                body: JSON.stringify({ is_active: !currentStatus }),
            });

            if (response.ok) {
                setPackages((prev) =>
                    prev.map((pkg) =>
                        pkg.id === packageId ? { ...pkg, is_active: !currentStatus } : pkg
                    )
                );
                addToast({
                    title: 'Package Updated',
                    description: `Package has been ${!currentStatus ? 'enabled' : 'disabled'}`,
                    variant: 'success',
                });
            } else {
                const errorData = await response.json();
                addToast({
                    title: 'Update Failed',
                    description: errorData.message || 'Failed to update package',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error updating package:', error);
        }
    };

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
        {
            key: 'is_active',
            header: 'Status',
            accessor: (row) =>
                row.is_active ? (
                    <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                    </Badge>
                ) : (
                    <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                    </Badge>
                ),
            sortable: true,
        },
    ];

    const actions = (row: DataPackage) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleToggleActive(row.id, row.is_active)}>
                    {row.is_active ? (
                        <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Disable
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Enable
                        </>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const handleRefresh = () => {
        setLoading(true);
        const fetchAllPackages = async () => {
            try {
                let page = 1;
                let allData: DataPackage[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/admin/packages?per_page=100&page=${page}`, {
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
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Packages" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Data Packages</h1>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Package
                    </Button>
                </div>
                <DataTable
                    data={packages}
                    columns={columns}
                    searchable
                    searchPlaceholder="Search by package name..."
                    searchKeys={['name', 'network']}
                    pagination
                    pageSize={15}
                    actions={actions}
                    loading={loading}
                    emptyMessage="No packages found"
                />
            </div>
            <CreatePackageModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleRefresh}
            />
        </AppLayout>
    );
}

