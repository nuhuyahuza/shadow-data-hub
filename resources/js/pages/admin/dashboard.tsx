import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Shield, Users, DollarSign, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import StatsCard from '../dashboard/components/StatsCard';
import RevenueChart from '@/components/admin/RevenueChart';
import UserGrowthChart from '@/components/admin/UserGrowthChart';
import RecentActivity from '@/components/admin/RecentActivity';
import QuickActions from '@/components/admin/QuickActions';
import SystemStatus from '@/components/admin/SystemStatus';
import { Spinner } from '@/components/ui/spinner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: '/admin/dashboard',
    },
];

interface DashboardData {
    stats: {
        total_users: number;
        total_revenue: number | string;
        total_profit: number | string;
        vendor_balance: number | string;
        pending_transactions: number;
        failed_transactions: number;
        today_revenue: number | string;
    };
    charts: {
        revenue_trends: Array<{ date: string; amount: number }>;
        user_growth: Array<{ date: string; count: number }>;
        transactions_by_status: {
            success: number;
            failed: number;
            pending: number;
        };
    };
    recent_activity: Array<{
        type: 'transaction' | 'user_registration';
        data: Record<string, unknown>;
        timestamp: string;
    }>;
    system_status: {
        vendor_balance: number | string;
        vendor_api_healthy: boolean;
        pending_count: number;
    };
}

export default function AdminDashboard() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/dashboard', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    // Try to parse error message from JSON response
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to load dashboard data');
                }
                return res.json();
            })
            .then((data) => {
                setDashboardData(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'An error occurred');
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Admin Dashboard" />
                <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 p-4">
                    <Spinner />
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </AppLayout>
        );
    }

    if (error || !dashboardData) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Admin Dashboard" />
                <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 p-4">
                    <p className="text-destructive">{error || 'Failed to load dashboard data'}</p>
                </div>
            </AppLayout>
        );
    }

    const { stats, charts, recent_activity, system_status } = dashboardData;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Total Users"
                        value={stats.total_users}
                        icon={Users}
                        description="All registered users"
                    />
                    <StatsCard
                        title="Total Revenue"
                        value={`GHS ${Number(stats.total_revenue).toFixed(2)}`}
                        icon={DollarSign}
                        description="All-time revenue"
                    />
                    <StatsCard
                        title="Total Profit"
                        value={`GHS ${Number(stats.total_profit).toFixed(2)}`}
                        icon={TrendingUp}
                        description="Net profit margin"
                    />
                    <StatsCard
                        title="Today's Revenue"
                        value={`GHS ${Number(stats.today_revenue).toFixed(2)}`}
                        icon={DollarSign}
                        description="Revenue today"
                    />
                </div>

                {/* Additional Stats Row */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatsCard
                        title="Pending Transactions"
                        value={stats.pending_transactions}
                        icon={Clock}
                        description="Awaiting processing"
                    />
                    <StatsCard
                        title="Failed Transactions"
                        value={stats.failed_transactions}
                        icon={AlertCircle}
                        description="Require attention"
                    />
                    <StatsCard
                        title="Vendor Balance"
                        value={`GHS ${Number(stats.vendor_balance).toFixed(2)}`}
                        icon={Shield}
                        description="Available balance"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid gap-4 md:grid-cols-2">
                    <RevenueChart data={charts.revenue_trends} />
                    <UserGrowthChart data={charts.user_growth} />
                </div>

                {/* Recent Activity and Quick Actions */}
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <RecentActivity activities={recent_activity} />
                    </div>
                    <div>
                        <QuickActions />
                        <div className="mt-4">
                            <SystemStatus
                                vendorBalance={system_status.vendor_balance}
                                vendorApiHealthy={system_status.vendor_api_healthy}
                                pendingCount={system_status.pending_count}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
