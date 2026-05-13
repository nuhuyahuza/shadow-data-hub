import { useCallback, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Store as StoreIcon, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { PackageCard } from '@/components/package-card';
import { getNetworkName } from '@/services/authService';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Store', href: '/agent/store' },
];

interface Store {
    id: number;
    user_id: string;
    name: string;
    slug: string | null;
    is_visible: boolean;
    created_at: string;
    store_package_pricings?: Array<{
        id: number;
        data_package_id: number;
        price: number | string;
        data_package?: { name: string; network: string };
    }>;
}

interface DataPackage {
    id: number;
    network: string;
    name: string;
    data_size: string;
    price: number | string;
    vendor_price: number | string;
    validity: string;
    is_active: boolean;
}

interface StorePricingItem {
    id: number;
    data_package_id: number;
    price: number | string;
    data_package?: { name: string; network: string };
}

const NETWORKS = ['mtn', 'telecel', 'airteltigo'] as const;

function groupPackagesByNetwork(packages: DataPackage[]): Record<string, DataPackage[]> {
    const grouped: Record<string, DataPackage[]> = {};
    for (const network of NETWORKS) {
        grouped[network] = packages.filter((p) => p.network === network);
    }
    return grouped;
}

export default function AgentStore() {
    const [store, setStore] = useState<Store | null | undefined>(undefined);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [packages, setPackages] = useState<DataPackage[]>([]);
    const [storePricing, setStorePricing] = useState<StorePricingItem[]>([]);
    const [pricingLoading, setPricingLoading] = useState(false);

    const fetchStore = async () => {
        try {
            const res = await apiFetch('/api/agent/store', { credentials: 'include' });
            const data = await res.json();
            setStore(data.store ?? null);
            if (data.store) {
                setName(data.store.name);
                setSlug(data.store.slug ?? '');
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

    const loadPackagesAndPricing = useCallback(async () => {
        if (!store) return;
        setPricingLoading(true);
        try {
            const [packagesRes, pricingRes] = await Promise.all([
                apiFetch('/api/agent/packages?per_page=100&page=1', { credentials: 'include' }),
                apiFetch('/api/agent/store/pricing', { credentials: 'include' }),
            ]);
            const packagesData = await packagesRes.json();
            const pricingData = await pricingRes.json();
            const list: DataPackage[] = packagesData.data?.data ?? packagesData.data ?? [];
            setPackages(Array.isArray(list) ? list : []);
            setStorePricing(Array.isArray(pricingData.pricing) ? pricingData.pricing : []);
        } catch {
            setPackages([]);
            setStorePricing([]);
        } finally {
            setPricingLoading(false);
        }
    }, [store]);

    useEffect(() => {
        if (store) loadPackagesAndPricing();
    }, [store, loadPackagesAndPricing]);

    const handleSavePrice = useCallback(
        async (dataPackageId: number, price: number) => {
            const res = await apiFetch('/api/agent/store/pricing', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data_package_id: dataPackageId, price }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? 'Failed to save price');
            setStorePricing((prev) => {
                const existing = prev.find((p) => p.data_package_id === dataPackageId);
                if (existing) return prev.map((p) => (p.data_package_id === dataPackageId ? { ...p, price } : p));
                return [...prev, { id: data.pricing?.id ?? 0, data_package_id: dataPackageId, price }];
            });
        },
        []
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch('/api/agent/store', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name || 'My Store', slug: slug || undefined }),
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
                body: JSON.stringify({ name, slug: slug || undefined, is_visible: isVisible }),
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
                        <div className="space-y-2">
                            <Label htmlFor="store-slug">Store URL slug (optional)</Label>
                            <Input
                                id="store-slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                placeholder="my-store"
                            />
                            <p className="text-xs text-muted-foreground">
                                Lowercase letters, numbers, hyphens only. Your store URL: slug.yourdomain.com
                            </p>
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
                        <div className="space-y-2">
                            <Label htmlFor="store-slug">Store URL slug {isVisible && '(required when visible)'}</Label>
                            <Input
                                id="store-slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                placeholder="my-store"
                                required={isVisible}
                            />
                            <p className="text-xs text-muted-foreground">
                                Lowercase letters, numbers, hyphens only. Your store URL: slug.yourdomain.com
                            </p>
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

                {store && (
                    <div className="rounded-lg border p-6">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
                            <Package className="h-5 w-5" />
                            Package pricing
                        </h2>
                        {pricingLoading ? (
                            <p className="text-sm text-muted-foreground">Loading packages...</p>
                        ) : (
                            (() => {
                                const grouped = groupPackagesByNetwork(packages);
                                return (
                                    <div className="flex flex-col gap-2">
                                        {NETWORKS.map((network) => {
                                            const list = grouped[network] ?? [];
                                            if (list.length === 0) return null;
                                            return (
                                                <Collapsible key={network} defaultOpen={network === 'mtn'}>
                                                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-left font-medium transition-colors hover:bg-muted dark:border-border dark:bg-muted/30 dark:hover:bg-muted/50">
                                                        <span className="flex items-center gap-2">
                                                            <ChevronRight className="h-4 w-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-90" />
                                                            {getNetworkName(network)}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {list.length} package{list.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <div className="space-y-4 pt-4">
                                                            {list.map((pkg) => {
                                                                const storePrice = storePricing.find((p) => p.data_package_id === pkg.id)?.price ?? null;
                                                                return (
                                                                    <PackageCard
                                                                        key={pkg.id}
                                                                        package={pkg}
                                                                        variant="configLarge"
                                                                        storePrice={storePrice != null ? Number(storePrice) : null}
                                                                        onSavePrice={async (price) => {
                                                                            await handleSavePrice(pkg.id, price);
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            );
                                        })}
                                        {packages.length === 0 && (
                                            <p className="text-sm text-muted-foreground">No packages available to price.</p>
                                        )}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
