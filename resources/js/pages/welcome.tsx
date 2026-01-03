import { dashboard, login, phoneLogin, buyData } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Search, Wifi, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getNetworkName, getNetworkColor } from '@/services/authService';

interface DataPackage {
    id: number;
    network: string;
    name: string;
    data_size: string;
    price: number | string; // Can be string from database
    validity: string;
    is_active: boolean;
}

interface WelcomeProps {
    packages: DataPackage[];
    canRegister?: boolean;
}

export default function Welcome({ packages: initialPackages, canRegister = true }: WelcomeProps) {
    const { auth } = usePage<SharedData>().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);

    // Filter packages based on search and network
    const filteredPackages = useMemo(() => {
        let filtered = initialPackages;

        // Filter by network
        if (selectedNetwork) {
            filtered = filtered.filter((pkg) => pkg.network === selectedNetwork);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (pkg) =>
                    pkg.name.toLowerCase().includes(query) ||
                    pkg.data_size.toLowerCase().includes(query) ||
                    getNetworkName(pkg.network).toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [initialPackages, selectedNetwork, searchQuery]);

    // Group packages by network
    const packagesByNetwork = useMemo(() => {
        const grouped: Record<string, DataPackage[]> = {
            mtn: [],
            telecel: [],
            airteltigo: [],
        };

        filteredPackages.forEach((pkg) => {
            if (grouped[pkg.network]) {
                grouped[pkg.network].push(pkg);
            }
        });

        return grouped;
    }, [filteredPackages]);

    const handlePackageSelect = (pkg: DataPackage) => {
        if (!auth.user) {
            // Redirect to login with package info
            router.visit(phoneLogin(), {
                data: { packageId: pkg.id },
            });
        } else {
            // Redirect to buy-data page with package pre-selected
            router.visit(buyData(), {
                data: { packageId: pkg.id, network: pkg.network },
            });
        }
    };

    const networks = ['mtn', 'telecel', 'airteltigo'] as const;

    return (
        <>
            <Head title="Data Hub - Buy Data Bundles">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                {/* Header */}
                <header className="border-b border-[#19140035] bg-white dark:border-[#3E3E3A] dark:bg-[#161615]">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wifi className="h-6 w-6 text-[#f53003] dark:text-[#FF4433]" />
                                <h1 className="text-xl font-semibold">Data Hub</h1>
                            </div>
                            <nav className="flex items-center gap-4">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={login()}
                                            className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                        >
                                            Log in
                                        </Link>
                                        {canRegister && (
                                            <Link
                                                href={phoneLogin()}
                                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                            >
                                                Sign Up
                                            </Link>
                                        )}
                                    </>
                                )}
                            </nav>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="border-b border-[#19140035] bg-gradient-to-b from-white to-[#FDFDFC] py-12 dark:border-[#3E3E3A] dark:from-[#161615] dark:to-[#0a0a0a]">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                                Buy Data Bundles
                            </h2>
                            <p className="mt-4 text-lg text-[#706f6c] dark:text-[#A1A09A]">
                                Fast, reliable data bundles for MTN, Telecel, and AirtelTigo
                            </p>
                        </div>
                    </div>
                </section>

                {/* Search and Filter Section */}
                <section className="sticky top-0 z-10 border-b border-[#19140035] bg-white/95 backdrop-blur-sm dark:border-[#3E3E3A] dark:bg-[#161615]/95">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#706f6c] dark:text-[#A1A09A]" />
                                <Input
                                    type="text"
                                    placeholder="Search packages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Network Filters */}
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-[#706f6c] dark:text-[#A1A09A]" />
                                <span className="text-sm text-[#706f6c] dark:text-[#A1A09A]">Filter:</span>
                                <Button
                                    variant={selectedNetwork === null ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedNetwork(null)}
                                >
                                    All
                                </Button>
                                {networks.map((network) => (
                                    <Button
                                        key={network}
                                        variant={selectedNetwork === network ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedNetwork(network)}
                                        className={
                                            selectedNetwork === network
                                                ? `${getNetworkColor(network)} text-white`
                                                : ''
                                        }
                                    >
                                        {getNetworkName(network)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Packages Section */}
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {filteredPackages.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-lg text-[#706f6c] dark:text-[#A1A09A]">
                                No packages found. Try adjusting your search or filters.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Show packages grouped by network if no network filter is selected */}
                            {!selectedNetwork ? (
                                networks.map((network) => {
                                    const networkPackages = packagesByNetwork[network];
                                    if (networkPackages.length === 0) return null;

                                    return (
                                        <div key={network} className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <h3
                                                    className={`text-2xl font-semibold ${getNetworkColor(network)} text-white px-4 py-2 rounded-lg`}
                                                >
                                                    {getNetworkName(network)} Packages
                                                </h3>
                                                <span className="text-sm text-[#706f6c] dark:text-[#A1A09A]">
                                                    ({networkPackages.length} packages)
                                                </span>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                {networkPackages.map((pkg) => (
                                                    <PackageCard
                                                        key={pkg.id}
                                                        pkg={pkg}
                                                        onSelect={handlePackageSelect}
                                                        isAuthenticated={!!auth.user}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredPackages.map((pkg) => (
                                        <PackageCard
                                            key={pkg.id}
                                            pkg={pkg}
                                            onSelect={handlePackageSelect}
                                            isAuthenticated={!!auth.user}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="border-t border-[#19140035] bg-white py-8 dark:border-[#3E3E3A] dark:bg-[#161615]">
                    <div className="mx-auto max-w-7xl px-4 text-center text-sm text-[#706f6c] dark:text-[#A1A09A] sm:px-6 lg:px-8">
                        <p>© {new Date().getFullYear()} Data Hub. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}

interface PackageCardProps {
    pkg: DataPackage;
    onSelect: (pkg: DataPackage) => void;
    isAuthenticated: boolean;
}

function PackageCard({ pkg, onSelect, isAuthenticated }: PackageCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-lg border border-[#19140035] bg-white transition-all hover:shadow-lg dark:border-[#3E3E3A] dark:bg-[#161615]">
            <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h4 className="text-lg font-semibold">{pkg.name}</h4>
                        <p className="text-sm text-[#706f6c] dark:text-[#A1A09A]">
                            {pkg.data_size}
                        </p>
                    </div>
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-medium text-white ${getNetworkColor(pkg.network)}`}
                    >
                        {getNetworkName(pkg.network)}
                    </span>
                </div>

                <div className="mb-4 space-y-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">
                            GHS {Number(pkg.price).toFixed(2)}
                        </span>
                    </div>
                    <p className="text-sm text-[#706f6c] dark:text-[#A1A09A]">
                        Valid for {pkg.validity}
                    </p>
                </div>

                <Button
                    onClick={() => onSelect(pkg)}
                    className="w-full"
                    variant={isAuthenticated ? 'default' : 'outline'}
                >
                    {isAuthenticated ? 'Buy Now' : 'Sign In to Buy'}
                </Button>
            </div>
        </div>
    );
}
