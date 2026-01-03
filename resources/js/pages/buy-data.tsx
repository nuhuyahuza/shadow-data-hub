import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ShoppingCart } from 'lucide-react';
import {
    detectNetwork,
    getNetworkName,
    getNetworkColor,
    formatPhoneForDisplay,
} from '@/services/authService';

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
    price: number;
    validity: string;
}

interface BuyDataProps {
    packages?: DataPackage[];
}

type Step = 'network' | 'package' | 'phone' | 'confirm' | 'processing' | 'result';

export default function BuyData({ packages: initialPackages }: BuyDataProps) {
    const [step, setStep] = useState<Step>('network');
    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<DataPackage | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
    const [packages, setPackages] = useState<DataPackage[]>(initialPackages || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (selectedNetwork) {
            fetch(`/api/packages/${selectedNetwork}`)
                .then((res) => res.json())
                .then((data) => setPackages(data))
                .catch(() => setError('Failed to load packages'));
        }
    }, [selectedNetwork]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPhoneNumber(value);
        if (value.length >= 3) {
            const detected = detectNetwork(value);
            setDetectedNetwork(detected);
            if (detected && detected !== selectedNetwork) {
                setError('Phone number network does not match selected network');
            } else {
                setError(null);
            }
        }
    };

    const handlePurchase = async () => {
        if (!selectedPackage || !phoneNumber) {
            return;
        }

        setStep('processing');
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/data/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    package_id: selectedPackage.id,
                    network: selectedPackage.network,
                    phone_number: phoneNumber,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Purchase failed');
            }

            setResult({
                success: true,
                message: data.message || 'Data bundle purchased successfully',
            });
            setStep('result');
        } catch (err) {
            setResult({
                success: false,
                message: err instanceof Error ? err.message : 'Purchase failed',
            });
            setStep('result');
        } finally {
            setLoading(false);
        }
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
                                                        GHS {pkg.price.toFixed(2)}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {selectedPackage && (
                                    <Button
                                        className="w-full"
                                        onClick={() => setStep('phone')}
                                    >
                                        Continue
                                    </Button>
                                )}
                            </div>
                        )}

                        {step === 'phone' && selectedPackage && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Enter phone number
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setStep('package')}
                                    >
                                        Back
                                    </Button>
                                </div>
                                <div className="grid gap-4">
                                    <div>
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={handlePhoneChange}
                                            placeholder="0244 123 456"
                                        />
                                        {detectedNetwork && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Detected: {getNetworkName(detectedNetwork)}
                                            </p>
                                        )}
                                        {error && (
                                            <p className="text-xs text-red-500 mt-1">{error}</p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm font-medium mb-2">Order Summary</p>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>Network:</span>
                                                <span>{getNetworkName(selectedPackage.network)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Package:</span>
                                                <span>{selectedPackage.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Amount:</span>
                                                <span className="font-bold">
                                                    GHS {selectedPackage.price.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={() => setStep('confirm')}
                                        disabled={!phoneNumber || !!error}
                                    >
                                        Continue
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 'confirm' && selectedPackage && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Confirm your purchase
                                </p>
                                <Card>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between">
                                            <span>Network:</span>
                                            <span>{getNetworkName(selectedPackage.network)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Package:</span>
                                            <span>{selectedPackage.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Phone:</span>
                                            <span>{formatPhoneForDisplay(phoneNumber)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                            <span>Total:</span>
                                            <span>GHS {selectedPackage.price.toFixed(2)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setStep('phone')}
                                    >
                                        Back
                                    </Button>
                                    <Button className="flex-1" onClick={handlePurchase}>
                                        Confirm Purchase
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 'processing' && (
                            <div className="text-center py-8">
                                <Spinner className="mx-auto mb-4" />
                                <p>Processing your request...</p>
                            </div>
                        )}

                        {step === 'result' && result && (
                            <div className="text-center py-8 space-y-4">
                                <div
                                    className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                                        result.success
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-red-100 text-red-600'
                                    }`}
                                >
                                    {result.success ? '✓' : '✗'}
                                </div>
                                <p className="font-medium">{result.message}</p>
                                <Button
                                    onClick={() => {
                                        setStep('network');
                                        setSelectedNetwork(null);
                                        setSelectedPackage(null);
                                        setPhoneNumber('');
                                        setResult(null);
                                    }}
                                >
                                    Buy Another
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

