import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store as StoreIcon } from 'lucide-react';
import { apiFetch } from '@/services/api';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Store', href: '/agent/store' },
];

interface Store {
    id: number;
    user_id: string;
    name: string;
    is_visible: boolean;
    created_at: string;
    store_package_pricings?: Array<{
        id: number;
        data_package_id: number;
        price: number | string;
        data_package?: { name: string; network: string };
    }>;
}

export default function AgentStore() {
    const [store, setStore] = useState<Store | null | undefined>(undefined);
    const [name, setName] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStore = async () => {
        try {
            const res = await apiFetch('/api/agent/store', { credentials: 'include' });
            const data = await res.json();
            setStore(data.store ?? null);
            if (data.store) {
                setName(data.store.name);
                setIsVisible(data.store.is_visible);
            }
        } catch {
            setStore(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStore();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch('/api/agent/store', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name || 'My Store' }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Failed to create store');
                return;
            }
            setStore(data.store);
            setIsVisible(data.store.is_visible);
        } catch {
            setError('Failed to create store');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store) return;
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch('/api/agent/store', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, is_visible: isVisible }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Failed to update store');
                return;
            }
            setStore(data.store);
        } catch {
            setError('Failed to update store');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="My Store" />
                <div className="flex items-center justify-center p-8">Loading...</div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Store" />
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <StoreIcon className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-semibold">My Store</h1>
                </div>

                {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {!store ? (
                    <form onSubmit={handleCreate} className="max-w-md space-y-4 rounded-lg border p-6">
                        <p className="text-muted-foreground">Create your store to set your own pricing on packages.</p>
                        <div className="space-y-2">
                            <Label htmlFor="store-name">Store name</Label>
                            <Input
                                id="store-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Store"
                                required
                            />
                        </div>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Creating...' : 'Create store'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleUpdate} className="max-w-md space-y-4 rounded-lg border p-6">
                        <div className="space-y-2">
                            <Label htmlFor="store-name">Store name</Label>
                            <Input
                                id="store-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                id="store-visible"
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) => setIsVisible(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="store-visible">Make store visible (customers can buy from your store)</Label>
                        </div>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save changes'}
                        </Button>
                    </form>
                )}

                {store?.store_package_pricings && store.store_package_pricings.length > 0 && (
                    <div className="rounded-lg border p-6">
                        <h2 className="mb-4 text-lg font-medium">Your package pricing</h2>
                        <ul className="space-y-2">
                            {store.store_package_pricings.map((p) => (
                                <li key={p.id} className="flex justify-between text-sm">
                                    <span>{p.data_package?.name ?? `Package #${p.data_package_id}`}</span>
                                    <span>GHS {Number(p.price).toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Add or edit pricing via the Packages page or API: POST /api/agent/store/pricing
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
