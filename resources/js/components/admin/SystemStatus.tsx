import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Activity } from 'lucide-react';

interface SystemStatusProps {
    vendorBalance: number | string;
    vendorApiHealthy: boolean;
    pendingCount: number;
}

export default function SystemStatus({
    vendorBalance,
    vendorApiHealthy,
    pendingCount,
}: SystemStatusProps) {
    const getStatusBadge = (healthy: boolean) => {
        if (healthy) {
            return (
                <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Healthy
                </Badge>
            );
        }
        return (
            <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Unhealthy
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Status
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Vendor API</span>
                        </div>
                        {getStatusBadge(vendorApiHealthy)}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Vendor Balance</span>
                        </div>
                        <span className="text-sm font-semibold">
                            GHS {Number(vendorBalance).toFixed(2)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Pending Transactions</span>
                        </div>
                        {pendingCount > 0 ? (
                            <Badge variant="secondary">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {pendingCount}
                            </Badge>
                        ) : (
                            <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                None
                            </Badge>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

