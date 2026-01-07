import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import WalletCard from './dashboard/components/WalletCard';
import StatsCard from './dashboard/components/StatsCard';
import RecentTransactions from './dashboard/components/RecentTransactions';
import { Database, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

interface DashboardProps {
    wallet: {
        balance: number | string;
        total_funded: number | string;
        total_spent: number | string;
    };
    totalDataPurchased: number | string;
    totalTransactions: number;
    recentTransactions: Array<{
        id: number;
        reference: string;
        type: string;
        network: string | null;
        package_name: string | null;
        phone_number: string | null;
        amount: number;
        status: string;
        created_at: string;
    }>;
}

export default function Dashboard({
    wallet,
    totalDataPurchased,
    totalTransactions,
    recentTransactions,
}: DashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="grid gap-4 md:grid-cols-3 animate-fade-in">
                    <div className="md:col-span-2">
                        <WalletCard
                            balance={wallet.balance}
                            totalFunded={wallet.total_funded}
                            totalSpent={wallet.total_spent}
                        />
                    </div>
                    <div className="grid gap-4">
                        <StatsCard
                            title="Total Data Purchased"
                            value={`GHS ${Number(totalDataPurchased).toFixed(2)}`}
                            icon={TrendingUp}
                            description="All successful purchases"
                        />
                        <StatsCard
                            title="Total Transactions"
                            value={totalTransactions}
                            icon={Database}
                            description="All time transactions"
                        />
                    </div>
                </div>
                <RecentTransactions transactions={recentTransactions} />
            </div>
        </AppLayout>
    );
}
