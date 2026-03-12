import { dashboard, login } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Wifi, Filter, Package, Zap, Clock, ArrowRight, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getNetworkName, getNetworkColor } from '@/services/authService';

interface StoreInfo {
    id: number;
    name: string;
    slug: string | null;
}

interface DataPackage {
    id: number;
    network: string;
    name: string;
    data_size: string;
    price: number | string;
    validity: string;
    is_active: boolean;
}

interface StorefrontProps {
    store: StoreInfo;
    packages: DataPackage[];
}

export default function Storefront({ store, packages: initialPackages }: StorefrontProps) {
    const { auth } = usePage<SharedData>().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    const filteredPackages = useMemo(() => {
        let filtered = initialPackages;
        if (selectedNetwork) {
            filtered = filtered.filter((pkg) => pkg.network === selectedNetwork);
        }
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

    const networks = ['mtn', 'telecel', 'airteltigo'] as const;

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <Head title={`${store.name} - Data Bundles`} />
            <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
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
                            <div className="flex items-center gap-2">
                                <Wifi className="h-6 w-6 text-[#f53003] dark:text-[#FF4433]" />
                                <h1 className="text-xl font-semibold">{store.name}</h1>
                            </div>
                            <nav className="flex items-center gap-4">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] transition-all duration-200 hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <Link
                                        href={login()}
                                        className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] dark:text-[#EDEDEC]"
                                    >
                                        Log in
                                    </Link>
                                )}
                                <Link
                                    href="/track-order"
                                    className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] transition-all duration-200 hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                >
                                    Track order
                                </Link>
                            </nav>
                        </div>
                    </div>
                </header>

                <section className="relative border-b border-[#19140035] bg-gradient-to-b from-white via-[#FDFDFC] to-white py-12 dark:border-[#3E3E3A] dark:from-[#161615] dark:via-[#0a0a0a] dark:to-[#161615]">
                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl bg-gradient-to-r from-[#1b1b18] to-[#706f6c] dark:from-[#EDEDEC] dark:to-[#A1A09A] bg-clip-text text-transparent">
                                Data Bundles
                            </h2>
                            <p className="mt-3 text-base text-[#706f6c] dark:text-[#A1A09A]">
                                Buy data from {store.name}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="sticky top-16 z-10 border-b border-[#19140035] bg-white/95 backdrop-blur-md shadow-sm dark:border-[#3E3E3A] dark:bg-[#161615]/95">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                            <div className="flex items-center gap-2 flex-wrap">
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
                                            selectedNetwork === network ? `${getNetworkColor(network)} text-white` : ''
                                        }
                                    >
                                        {getNetworkName(network)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {filteredPackages.length === 0 ? (
                        <div className="text-center py-16">
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
                            {!selectedNetwork
                                ? networks.map((network) => {
                                      const networkPackages = packagesByNetwork[network];
                                      if (networkPackages.length === 0) return null;
                                      return (
                                          <div key={network} className="space-y-4">
                                              <h3
                                                  className={`text-2xl font-semibold ${getNetworkColor(network)} text-white px-4 py-2 rounded-lg w-fit`}
                                              >
                                                  {getNetworkName(network)} Packages
                                              </h3>
                                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                  {networkPackages.map((pkg) => (
                                                      <StorefrontPackageCard
                                                          key={pkg.id}
                                                          pkg={pkg}
                                                          storeId={store.id}
                                                          isAuthenticated={!!auth.user}
                                                      />
                                                  ))}
                                              </div>
                                          </div>
                                      );
                                  })
                                : (
                                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                          {filteredPackages.map((pkg) => (
                                              <StorefrontPackageCard
                                                  key={pkg.id}
                                                  pkg={pkg}
                                                  storeId={store.id}
                                                  isAuthenticated={!!auth.user}
                                              />
                                          ))}
                                      </div>
                                  )}
                        </div>
                    )}
                </main>

                <footer className="relative border-t border-[#19140035] bg-white py-8 dark:border-[#3E3E3A] dark:bg-[#161615]">
                    <div className="mx-auto max-w-7xl px-4 text-center text-sm text-[#706f6c] dark:text-[#A1A09A] sm:px-6 lg:px-8">
                        <p>© {new Date().getFullYear()} {store.name}. Data Hub.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}

interface StorefrontPackageCardProps {
    pkg: DataPackage;
    storeId: number;
    isAuthenticated: boolean;
}

function StorefrontPackageCard({ pkg, storeId }: StorefrontPackageCardProps) {
    const networkColor = getNetworkColor(pkg.network);
    const networkName = getNetworkName(pkg.network);
    const checkoutUrl = `/checkout/${pkg.id}${storeId ? `?store_id=${storeId}` : ''}`;

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

    return (
        <div
            className={`group relative overflow-hidden rounded-xl border border-[#19140035] bg-gradient-to-br ${getGradientColors(pkg.network)} transition-all duration-300 hover:shadow-2xl hover:shadow-[#19140035]/20 hover:-translate-y-1 dark:border-[#3E3E3A] dark:hover:border-[#62605b]`}
        >
            <div className="relative p-6">
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`rounded-lg ${networkColor} p-1.5`}>
                            <Wifi className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${networkColor}`}>
                            {networkName}
                        </span>
                    </div>
                    <Package className="h-5 w-5 text-[#706f6c] dark:text-[#A1A09A] opacity-50" />
                </div>
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
                <Link href={checkoutUrl} className="block">
                    <Button
                        className={`w-full ${networkColor} hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg`}
                        variant="default"
                    >
                        <span className="flex items-center justify-center gap-2">
                            Buy Now
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </Button>
                </Link>
            </div>
        </div>
    );
}
