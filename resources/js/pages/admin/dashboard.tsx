import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, DollarSign, TrendingUp } from 'lucide-react';
import StatsCard from '../../dashboard/components/StatsCard';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: '/admin/dashboard',
    },
];

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        total_users: 0,
        total_revenue: 0,
        total_profit: 0,
        vendor_balance: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/dashboard')
            .then((res) => res.json())
            .then((data) => {
                setStats(data);
                setLoading(false);
            });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Admin Dashboard
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-4">
                                <StatsCard
                                    title="Total Users"
                                    value={stats.total_users}
                                    icon={Users}
                                />
                                <StatsCard
                                    title="Total Revenue"
                                    value={`GHS ${stats.total_revenue.toFixed(2)}`}
                                    icon={DollarSign}
                                />
                                <StatsCard
                                    title="Total Profit"
                                    value={`GHS ${stats.total_profit.toFixed(2)}`}
                                    icon={TrendingUp}
                                />
                                <StatsCard
                                    title="Vendor Balance"
                                    value={`GHS ${stats.vendor_balance.toFixed(2)}`}
                                    icon={Shield}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

