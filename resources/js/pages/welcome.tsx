import { dashboard, login, phoneLogin } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Wifi, Filter, Package, Zap, Clock, ArrowRight, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getNetworkName, getNetworkColor } from '@/services/authService';
import PurchaseModal from '@/components/purchase-modal';

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
    const [selectedPackage, setSelectedPackage] = useState<DataPackage | null>(null);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const headerRef = useRef<HTMLElement>(null);
    const heroRef = useRef<HTMLElement>(null);

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
        setSelectedPackage(pkg);
        setIsPurchaseModalOpen(true);
    };

    const networks = ['mtn', 'telecel', 'airteltigo'] as const;

    // Handle scroll for header backdrop blur
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
                <header
                    ref={headerRef}
                    className={`sticky top-0 z-50 border-b border-[#19140035] transition-all duration-300 ${
                        isScrolled
                            ? 'bg-white/80 backdrop-blur-md shadow-sm dark:bg-[#161615]/80 dark:border-[#3E3E3A]'
                            : 'bg-white dark:bg-[#161615] dark:border-[#3E3E3A]'
                    }`}
                >
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 animate-fade-in">
                                <Wifi className="h-6 w-6 text-[#f53003] dark:text-[#FF4433] transition-transform duration-300 hover:scale-110" />
                                <h1 className="text-xl font-semibold">Data Hub</h1>
                            </div>
                            <nav className="flex items-center gap-4">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] transition-all duration-200 hover:border-[#1915014a] hover:scale-105 dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={login()}
                                            className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] transition-all duration-200 hover:border-[#19140035] hover:scale-105 dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                        >
                                            Log in
                                        </Link>
                                        {canRegister && (
                                            <Link
                                                href={phoneLogin()}
                                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] transition-all duration-200 hover:border-[#1915014a] hover:scale-105 dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
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
                <section
                    ref={heroRef}
                    className="relative border-b border-[#19140035] bg-gradient-to-b from-white via-[#FDFDFC] to-white py-16 dark:border-[#3E3E3A] dark:from-[#161615] dark:via-[#0a0a0a] dark:to-[#161615] overflow-hidden"
                >
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 opacity-30 dark:opacity-20">
                        <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-yellow-400 blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-blue-400 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center animate-slide-down">
                            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-r from-[#1b1b18] to-[#706f6c] dark:from-[#EDEDEC] dark:to-[#A1A09A] bg-clip-text text-transparent">
                                Buy Data Bundles
                            </h2>
                            <p className="mt-4 text-lg text-[#706f6c] dark:text-[#A1A09A] animate-fade-in" style={{ animationDelay: '100ms' }}>
                                Fast, reliable data bundles for MTN, Telecel, and AirtelTigo
                            </p>
                        </div>
                    </div>
                </section>

                {/* Search and Filter Section */}
                <section className="sticky top-16 z-10 border-b border-[#19140035] bg-white/95 backdrop-blur-md shadow-sm dark:border-[#3E3E3A] dark:bg-[#161615]/95 transition-all duration-300">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-down">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md group">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#706f6c] dark:text-[#A1A09A] transition-colors duration-200 group-focus-within:text-[#1b1b18] dark:group-focus-within:text-[#EDEDEC]" />
                                <Input
                                    type="text"
                                    placeholder="Search packages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-[#19140035]/20 dark:focus:ring-[#3E3E3A]/20"
                                />
                            </div>

                            {/* Network Filters */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter className="h-4 w-4 text-[#706f6c] dark:text-[#A1A09A]" />
                                <span className="text-sm text-[#706f6c] dark:text-[#A1A09A]">Filter:</span>
                                <Button
                                    variant={selectedNetwork === null ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedNetwork(null)}
                                    className="transition-all duration-200 hover:scale-105"
                                >
                                    All
                                </Button>
                                {networks.map((network, index) => (
                                    <Button
                                        key={network}
                                        variant={selectedNetwork === network ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedNetwork(network)}
                                        className={`transition-all duration-200 hover:scale-105 ${
                                            selectedNetwork === network
                                                ? `${getNetworkColor(network)} text-white`
                                                : ''
                                        }`}
                                        style={{ animationDelay: `${index * 50}ms` }}
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
                        <div className="text-center py-16 animate-fade-in">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#19140035]/10 dark:bg-[#3E3E3A]/20 mb-4">
                                <Inbox className="h-8 w-8 text-[#706f6c] dark:text-[#A1A09A]" />
                            </div>
                            <p className="text-lg font-medium text-[#706f6c] dark:text-[#A1A09A] mb-2">
                                No packages found
                            </p>
                            <p className="text-sm text-[#706f6c]/80 dark:text-[#A1A09A]/80">
                                Try adjusting your search or filters
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
                                        <div key={network} className="space-y-4 animate-slide-up">
                                            <div className="flex items-center gap-3">
                                                <h3
                                                    className={`text-2xl font-semibold ${getNetworkColor(network)} text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105`}
                                                >
                                                    {getNetworkName(network)} Packages
                                                </h3>
                                                <span className="text-sm text-[#706f6c] dark:text-[#A1A09A]">
                                                    ({networkPackages.length} packages)
                                                </span>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                {networkPackages.map((pkg, index) => (
                                                    <div
                                                        key={pkg.id}
                                                        className="animate-scale-in"
                                                        style={{ animationDelay: `${index * 50}ms` }}
                                                    >
                                                        <PackageCard
                                                            pkg={pkg}
                                                            onSelect={handlePackageSelect}
                                                            isAuthenticated={!!auth.user}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredPackages.map((pkg, index) => (
                                        <div
                                            key={pkg.id}
                                            className="animate-scale-in"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <PackageCard
                                                pkg={pkg}
                                                onSelect={handlePackageSelect}
                                                isAuthenticated={!!auth.user}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="relative border-t border-[#19140035] bg-white py-8 dark:border-[#3E3E3A] dark:bg-[#161615] overflow-hidden">
                    {/* Subtle background pattern */}
                    <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                            backgroundSize: '40px 40px'
                        }}></div>
                    </div>
                    <div className="relative mx-auto max-w-7xl px-4 text-center text-sm text-[#706f6c] dark:text-[#A1A09A] sm:px-6 lg:px-8 animate-fade-in">
                        <p>© {new Date().getFullYear()} Data Hub. All rights reserved.</p>
                    </div>
                </footer>
            </div>

            {/* Purchase Modal */}
            <PurchaseModal
                isOpen={isPurchaseModalOpen}
                onClose={() => {
                    setIsPurchaseModalOpen(false);
                    setSelectedPackage(null);
                }}
                package={selectedPackage}
                useWallet={false}
            />
        </>
    );
}

interface PackageCardProps {
    pkg: DataPackage;
    onSelect: (pkg: DataPackage) => void;
    isAuthenticated: boolean;
}

function PackageCard({ pkg, onSelect }: PackageCardProps) {
    const networkColor = getNetworkColor(pkg.network);
    const networkName = getNetworkName(pkg.network);
    
    // Get gradient colors based on network
    const getGradientColors = (network: string) => {
        switch (network) {
            case 'mtn':
                return 'from-yellow-50 via-yellow-100/50 to-white dark:from-yellow-950/20 dark:via-yellow-900/10 dark:to-[#161615]';
            case 'telecel':
                return 'from-red-50 via-red-100/50 to-white dark:from-red-950/20 dark:via-red-900/10 dark:to-[#161615]';
            case 'airteltigo':
                return 'from-blue-50 via-blue-100/50 to-white dark:from-blue-950/20 dark:via-blue-900/10 dark:to-[#161615]';
            default:
                return 'from-gray-50 via-gray-100/50 to-white dark:from-gray-950/20 dark:via-gray-900/10 dark:to-[#161615]';
        }
    };

    const gradientColors = getGradientColors(pkg.network);

    return (
        <div className={`group relative overflow-hidden rounded-xl border border-[#19140035] bg-gradient-to-br ${gradientColors} transition-all duration-300 hover:shadow-2xl hover:shadow-[#19140035]/20 hover:-translate-y-1 hover:border-[#1915014a] dark:border-[#3E3E3A] dark:hover:border-[#62605b] dark:hover:shadow-[#3E3E3A]/30`}>
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#1b1b18] dark:bg-[#EDEDEC] blur-2xl"></div>
                <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-[#1b1b18] dark:bg-[#EDEDEC] blur-3xl"></div>
            </div>

            <div className="relative p-6">
                {/* Network Badge with Icon */}
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`rounded-lg ${networkColor} p-1.5`}>
                            <Wifi className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${networkColor}`}
                        >
                            {networkName}
                        </span>
                    </div>
                    <Package className="h-5 w-5 text-[#706f6c] dark:text-[#A1A09A] opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Data Size - Prominent with Icon */}
                <div className="mb-5">
                    <div className="flex items-start gap-3">
                        <div className={`rounded-lg ${networkColor} p-2 mt-1`}>
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] leading-tight">
                                {pkg.data_size}
                            </p>
                            <p className="text-sm text-[#706f6c] dark:text-[#A1A09A] mt-1.5 font-medium">
                                {pkg.name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Price - Clear and Prominent */}
                <div className="mb-5 rounded-lg border border-[#19140035]/50 bg-white/50 p-4 backdrop-blur-sm dark:border-[#3E3E3A]/50 dark:bg-[#161615]/50">
                    <div className="flex items-baseline justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-[#706f6c] dark:text-[#A1A09A] mb-1.5 uppercase tracking-wide">
                                Price
                            </p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-semibold text-[#706f6c] dark:text-[#A1A09A]">GHS</span>
                                <span className="text-4xl font-bold text-[#1b1b18] dark:text-[#EDEDEC]">
                                    {Number(pkg.price).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-[#19140035]/30 dark:border-[#3E3E3A]/30">
                        <Clock className="h-3.5 w-3.5 text-[#706f6c] dark:text-[#A1A09A]" />
                        <p className="text-xs text-[#706f6c] dark:text-[#A1A09A] font-medium">
                            Valid for {pkg.validity}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => onSelect(pkg)}
                    className={`w-full group/btn ${networkColor} hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg`}
                    variant="default"
                >
                    <span className="flex items-center justify-center gap-2">
                        Buy Now
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </span>
                </Button>
            </div>
        </div>
    );
}
