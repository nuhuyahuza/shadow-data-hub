import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import DataTable, { type ColumnDef } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: '/agent/users',
    },
];

interface User extends Record<string, unknown> {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    created_at: string;
}

export default function AgentUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllUsers = async () => {
            try {
                let page = 1;
                let allData: User[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/agent/users?per_page=100&page=${page}`, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to load users');
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

                setUsers(allData);
                setLoading(false);
            } catch (err) {
                console.error('Error loading users:', err);
                setLoading(false);
            }
        };

        fetchAllUsers();
    }, []);

    const getRoleBadge = (role: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
            admin: 'default',
            agent: 'secondary',
            user: 'outline',
        };
        return (
            <Badge variant={variants[role] || 'outline'}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
        );
    };

    const columns: ColumnDef<User>[] = [
        {
            key: 'name',
            header: 'Name',
            accessor: (row) => (
                <div>
                    <div className="font-medium">{row.name || 'N/A'}</div>
                    {row.email && (
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            key: 'phone',
            header: 'Phone',
            accessor: (row) => <span>{row.phone || 'N/A'}</span>,
            sortable: true,
        },
        {
            key: 'role',
            header: 'Role',
            accessor: (row) => getRoleBadge(row.role),
            sortable: true,
        },
        {
            key: 'created_at',
            header: 'Created At',
            accessor: (row) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
                </span>
            ),
            sortable: true,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <DataTable
                    data={users}
                    columns={columns}
                    searchable
                    searchPlaceholder="Search by name, email, or phone..."
                    searchKeys={['name', 'email', 'phone']}
                    pagination
                    pageSize={15}
                    loading={loading}
                    emptyMessage="No users found"
                    title="Users"
                    titleIcon={<Users className="h-5 w-5" />}
                />
            </div>
        </AppLayout>
    );
}

