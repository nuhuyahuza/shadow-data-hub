import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { getNetworkName, getNetworkColor } from '@/services/authService';
import PurchaseModal from '@/components/purchase-modal';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Buy Data',
        href: '/buy-data',
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

interface BuyDataProps {
    packages?: DataPackage[];
}

type Step = 'network' | 'package';

export default function BuyData({ packages: initialPackages }: BuyDataProps) {
    const [step, setStep] = useState<Step>('network');
    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<DataPackage | null>(null);
    const [packages, setPackages] = useState<DataPackage[]>(initialPackages || []);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (selectedNetwork) {
            fetch(`/api/packages/${selectedNetwork}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            })
                .then((res) => res.json())
                .then((data) => {
                    setPackages(Array.isArray(data) ? data : data.data || []);
                })
                .catch((err) => {
                    console.error('Failed to load packages:', err);
                });
        }
    }, [selectedNetwork]);

    const handlePackageSelect = (pkg: DataPackage) => {
        setSelectedPackage(pkg);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        // Optionally reset to network selection after successful purchase
        // setStep('network');
        // setSelectedNetwork(null);
        // setSelectedPackage(null);
    };

    const networks = [
        { id: 'mtn', name: 'MTN', color: 'bg-yellow-500' },
        { id: 'telecel', name: 'Telecel', color: 'bg-red-500' },
        { id: 'airteltigo', name: 'AirtelTigo', color: 'bg-blue-500' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buy Data" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Buy Data Bundle
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {step === 'network' && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Select a network
                                </p>
                                <div className="grid gap-4 md:grid-cols-3">
                                    {networks.map((network) => (
                                        <button
                                            key={network.id}
                                            onClick={() => {
                                                setSelectedNetwork(network.id);
                                                setStep('package');
                                            }}
                                            className={`p-6 rounded-lg border-2 hover:border-primary transition-colors text-left ${network.color} text-white`}
                                        >
                                            <h3 className="text-xl font-bold">{network.name}</h3>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'package' && selectedNetwork && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Select a package
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setStep('network');
                                            setSelectedPackage(null);
                                        }}
                                    >
                                        Change Network
                                    </Button>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {packages.map((pkg) => (
                                        <Card
                                            key={pkg.id}
                                            className={`cursor-pointer hover:border-primary ${
                                                selectedPackage?.id === pkg.id
                                                    ? 'border-primary'
                                                    : ''
                                            }`}
                                            onClick={() => setSelectedPackage(pkg)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">
                                                            {pkg.name}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            {pkg.validity}
                                                        </p>
                                                    </div>
                                                    <p className="text-xl font-bold">
                                                        GHS {Number(pkg.price).toFixed(2)}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {selectedPackage && (
                                    <Button
                                        className="w-full"
                                        onClick={() => handlePackageSelect(selectedPackage)}
                                    >
                                        Continue
                                    </Button>
                                )}
                            </div>
                        )}

                    </CardContent>
                </Card>

                <PurchaseModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    package={selectedPackage}
                />
            </div>
        </AppLayout>
    );
}

