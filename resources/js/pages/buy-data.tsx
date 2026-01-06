import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShoppingCart, Wallet, AlertCircle } from 'lucide-react';
import { getNetworkName, getNetworkColor } from '@/services/authService';
import { getWallet } from '@/services/walletService';
import PurchaseModal from '@/components/purchase-modal';
import WalletFundingModal from '@/components/wallet-funding-modal';

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
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [loadingBalance, setLoadingBalance] = useState(true);
    const [insufficientFunds, setInsufficientFunds] = useState<{
        show: boolean;
        required: number;
        shortfall: number;
    }>({ show: false, required: 0, shortfall: 0 });

    // Fetch wallet balance on mount
    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const wallet = await getWallet();
                setWalletBalance(Number(wallet.balance));
            } catch (err) {
                console.error('Failed to load wallet:', err);
            } finally {
                setLoadingBalance(false);
            }
        };
        fetchWallet();
    }, []);

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

    const handlePackageSelect = async (pkg: DataPackage) => {
        const packagePrice = Number(pkg.price);
        
        // Check wallet balance before opening modal
        if (walletBalance < packagePrice) {
            setInsufficientFunds({
                show: true,
                required: packagePrice,
                shortfall: packagePrice - walletBalance,
            });
            return;
        }

        setInsufficientFunds({ show: false, required: 0, shortfall: 0 });
        setSelectedPackage(pkg);
        setIsModalOpen(true);
    };

    const handleWalletFunded = async () => {
        // Refresh wallet balance after funding
        try {
            const wallet = await getWallet();
            setWalletBalance(Number(wallet.balance));
            setIsWalletModalOpen(false);
            
            // If a package was selected, try to open purchase modal again
            if (selectedPackage) {
                const packagePrice = Number(selectedPackage.price);
                if (Number(wallet.balance) >= packagePrice) {
                    setInsufficientFunds({ show: false, required: 0, shortfall: 0 });
                    setIsModalOpen(true);
                }
            }
        } catch (err) {
            console.error('Failed to refresh wallet:', err);
        }
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
                        {insufficientFunds.show && (
                            <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20">
                                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                <AlertTitle className="text-orange-800 dark:text-orange-200">
                                    Insufficient Wallet Balance
                                </AlertTitle>
                                <AlertDescription className="text-orange-700 dark:text-orange-300">
                                    <div className="space-y-2 mt-2">
                                        <p>
                                            You need GHS {insufficientFunds.required.toFixed(2)} to purchase this package, but your current balance is GHS {walletBalance.toFixed(2)}.
                                        </p>
                                        <p className="font-semibold">
                                            Shortfall: GHS {insufficientFunds.shortfall.toFixed(2)}
                                        </p>
                                        <Button
                                            onClick={() => setIsWalletModalOpen(true)}
                                            className="mt-2 bg-orange-600 hover:bg-orange-700"
                                        >
                                            <Wallet className="h-4 w-4 mr-2" />
                                            Fund My Wallet
                                        </Button>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
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
                    onSuccess={handleWalletFunded}
                />

                <WalletFundingModal
                    isOpen={isWalletModalOpen}
                    onClose={() => setIsWalletModalOpen(false)}
                    onSuccess={handleWalletFunded}
                />
            </div>
        </AppLayout>
    );
}

