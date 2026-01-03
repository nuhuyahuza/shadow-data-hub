import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

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

    useEffect(() => {
        fetch('/api/packages')
            .then((res) => res.json())
            .then((data) => {
                setPackages(data);
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
                            <p>Loading packages...</p>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-3">
                                {packages.map((pkg) => (
                                    <Card key={pkg.id}>
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
                                                    {pkg.validity}
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

