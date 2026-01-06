import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, UserPlus, ShoppingCart, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActivityItem {
    type: 'transaction' | 'user_registration';
    data: {
        id?: string;
        reference?: string;
        user_name?: string;
        name?: string;
        email?: string;
        phone?: string;
        amount?: number;
        status?: string;
        package_name?: string;
        role?: string;
        [key: string]: unknown;
    };
    timestamp: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
    const getActivityIcon = (type: string, status?: string) => {
        if (type === 'user_registration') {
            return <UserPlus className="h-4 w-4" />;
        }
        if (status === 'success') {
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        }
        if (status === 'failed') {
            return <XCircle className="h-4 w-4 text-red-500" />;
        }
        return <Clock className="h-4 w-4 text-yellow-500" />;
    };

    const getActivityTitle = (activity: ActivityItem) => {
        if (activity.type === 'user_registration') {
            return `New ${activity.data.role || 'user'} registered: ${activity.data.name || activity.data.email || activity.data.phone}`;
        }
        return `Transaction: ${activity.data.reference} - ${activity.data.user_name || 'Guest'}`;
    };

    const getActivityDescription = (activity: ActivityItem) => {
        if (activity.type === 'user_registration') {
            return activity.data.email || activity.data.phone || 'No contact info';
        }
        const parts = [];
        if (activity.data.package_name) {
            parts.push(activity.data.package_name);
        }
        if (activity.data.amount) {
            parts.push(`GHS ${Number(activity.data.amount).toFixed(2)}`);
        }
        return parts.join(' • ') || 'Transaction details';
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        }
        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
        if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No recent activity
                        </p>
                    ) : (
                        activities.map((activity, index) => (
                            <div
                                key={`${activity.type}-${activity.data.id || index}-${index}`}
                                className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                            >
                                <div className="mt-0.5">
                                    {getActivityIcon(activity.type, activity.data.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium truncate">
                                            {getActivityTitle(activity)}
                                        </p>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatTimestamp(activity.timestamp)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {getActivityDescription(activity)}
                                    </p>
                                    {activity.data.status && (
                                        <div className="mt-2">
                                            <Badge
                                                variant={
                                                    activity.data.status === 'success'
                                                        ? 'default'
                                                        : activity.data.status === 'failed'
                                                          ? 'destructive'
                                                          : 'secondary'
                                                }
                                                className="text-xs"
                                            >
                                                {activity.data.status}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

