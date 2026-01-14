import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import DataTable, { type ColumnDef } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, UserCheck, UserX } from 'lucide-react';
import CreateUserModal from '@/components/admin/CreateUserModal';
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
        title: 'Users',
        href: '/admin/users',
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

export default function AdminUsers() {
    const { addToast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        const fetchAllUsers = async () => {
            try {
                let page = 1;
                let allData: User[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/admin/users?per_page=100&page=${page}`, {
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
                setUsers((prev) =>
                    prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
                );
                addToast({
                    title: 'Role Updated',
                    description: `User role has been updated to ${newRole}`,
                    variant: 'success',
                });
            } else {
                const errorData = await response.json();
                addToast({
                    title: 'Update Failed',
                    description: errorData.message || 'Failed to update user role',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error updating user role:', error);
        }
    };

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

    const actions = (row: User) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {row.role !== 'agent' && (
                    <DropdownMenuItem onClick={() => handleRoleUpdate(row.id, 'agent')}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Promote to Agent
                    </DropdownMenuItem>
                )}
                {row.role !== 'admin' && (
                    <DropdownMenuItem onClick={() => handleRoleUpdate(row.id, 'admin')}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Promote to Admin
                    </DropdownMenuItem>
                )}
                {row.role !== 'user' && (
                    <DropdownMenuItem onClick={() => handleRoleUpdate(row.id, 'user')}>
                        <UserX className="h-4 w-4 mr-2" />
                        Demote to User
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const handleRefresh = () => {
        setLoading(true);
        const fetchAllUsers = async () => {
            try {
                let page = 1;
                let allData: User[] = [];
                let hasMore = true;

                while (hasMore) {
                    const response = await fetch(`/api/admin/users?per_page=100&page=${page}`, {
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
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </div>
                <DataTable
                    data={users}
                    columns={columns}
                    searchable
                    searchPlaceholder="Search by name, email, or phone..."
                    searchKeys={['name', 'email', 'phone']}
                    pagination
                    pageSize={15}
                    actions={actions}
                    loading={loading}
                    emptyMessage="No users found"
                />
            </div>
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleRefresh}
            />
        </AppLayout>
    );
}


