import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import DataTable, { type ColumnDef } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, UserX, UserPlus } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Agents',
        href: '/admin/agents',
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

export default function AdminAgents() {
    const [agents, setAgents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllAgents = async () => {
            try {
                let page = 1;
                let allData: User[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/admin/users?role=agent&per_page=100&page=${page}`, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to load agents');
                    }

                    const data = await response.json();
                    const pageData = data.data || data;
                    const agentData = (Array.isArray(pageData) ? pageData : []).filter((user: User) => user.role === 'agent');
                    allData = [...allData, ...agentData];

                    // Check if there are more pages
                    if (data.last_page && page < data.last_page) {
                        page++;
                    } else {
                        hasMore = false;
                    }
                }

                setAgents(allData);
                setLoading(false);
            } catch (err) {
                console.error('Error loading agents:', err);
                setLoading(false);
            }
        };

        fetchAllAgents();
    }, []);

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'include',
                body: JSON.stringify({ role: newRole }),
            });

            if (response.ok) {
                // Remove from list if demoted
                if (newRole !== 'agent') {
                    setAgents((prev) => prev.filter((agent) => agent.id !== userId));
                } else {
                    setAgents((prev) =>
                        prev.map((agent) => (agent.id === userId ? { ...agent, role: newRole } : agent))
                    );
                }
            }
        } catch (error) {
            console.error('Error updating agent role:', error);
        }
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

    const actions = (row: User) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRoleUpdate(row.id, 'user')}>
                    <UserX className="h-4 w-4 mr-2" />
                    Remove Agent Role
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agents" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Agent Management</h1>
                    <Button onClick={() => router.visit('/admin/users?create=true&role=agent')}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Agent
                    </Button>
                </div>
                <DataTable
                    data={agents}
                    columns={columns}
                    searchable
                    searchPlaceholder="Search by name, email, or phone..."
                    searchKeys={['name', 'email', 'phone']}
                    pagination
                    pageSize={15}
                    actions={actions}
                    loading={loading}
                    emptyMessage="No agents found"
                />
            </div>
        </AppLayout>
    );
}

