import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Packages',
        href: '/packages',
    },
];

interface DataPackage {
    id: number;
    network: string;
    name: string;
    data_size: string;
    price: number | string;
    validity: string;
}

export default function Packages() {
    const [packages, setPackages] = useState<DataPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/packages', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('Failed to load packages');
                }
                const data = await res.json();
                setPackages(Array.isArray(data) ? data : data.data || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error loading packages:', err);
                setError(err instanceof Error ? err.message : 'Failed to load packages');
                setLoading(false);
            });
    }, []);

    const getNetworkName = (network: string) => {
        const names: Record<string, string> = {
            mtn: 'MTN',
            telecel: 'Telecel',
            airteltigo: 'AirtelTigo',
        };
        return names[network] || network;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Data Packages" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Available Data Packages
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12 animate-fade-in">
                                <Spinner />
                                <span className="ml-2 text-muted-foreground">Loading packages...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 animate-slide-down">
                                <p className="text-destructive">{error}</p>
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground animate-fade-in">
                                <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                                <p>No packages available</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-3">
                                {packages.map((pkg, index) => (
                                    <Card
                                        key={pkg.id}
                                        className="transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-primary/20 animate-scale-in"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <CardContent className="p-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold">
                                                        {pkg.name}
                                                    </h3>
                                                    <span className="text-xs text-muted-foreground">
                                                        {getNetworkName(pkg.network)}
                                                    </span>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    GHS {Number(pkg.price).toFixed(2)}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {pkg.data_size} • {pkg.validity}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

