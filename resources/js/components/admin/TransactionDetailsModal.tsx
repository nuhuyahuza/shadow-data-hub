import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, Clock, Package, User, Phone, DollarSign, Calendar, Ban, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface TransactionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: {
        id: number;
        reference: string;
        type: string;
        status: "pending" | "refunded" | "failed";
        amount: number | string;
        network?: string;
        phone_number?: string;
        user?: {
            id: string;
            name: string;
            email?: string;
            phone?: string;
        };
        package?: {
            id: number;
            name: string;
            network: string;
            data_size: string;
            price: number | string;
        };
        vendor_reference?: string;
        vendor_response?: Record<string, unknown>;
        created_at: string;
        updated_at: string;
    } | null;
    onStatusUpdate?: (transactionId: number, newStatus: string) => Promise<void>;
    onRefund?: (transactionId: number) => Promise<void>;
    apiPrefix?: 'admin' | 'agent';
}

export default function TransactionDetailsModal({
    isOpen,
    onClose,
    transaction,
    onStatusUpdate,
    onRefund,
}: TransactionDetailsModalProps) {
    const { addToast } = useToast();
    const [selectedStatus, setSelectedStatus] = useState<string>(transaction?.status || '');
    const [updating, setUpdating] = useState(false);
    const [refunding, setRefunding] = useState(false);

    // Update selected status when transaction changes
    useEffect(() => {
        if (transaction) {
            setSelectedStatus(transaction.status);
        }
    }, [transaction]);

    if (!transaction) {
        return null;
    }

    const handleStatusUpdate = async () => {
        if (selectedStatus === transaction.status || !onStatusUpdate) {
            return;
        }

        setUpdating(true);
        try {
            await onStatusUpdate(transaction.id, selectedStatus);
            addToast({
                title: 'Status Updated',
                description: `Transaction status has been updated to ${selectedStatus}`,
                variant: 'success',
            });
        } catch (error) {
            console.log(error);
            addToast({
                title: 'Update Failed',
                description: 'Failed to update transaction status',
                variant: 'destructive',
            });
        } finally {
            setUpdating(false);
        }
    };

    const handleRefund = async () => {
        if (!onRefund || !transaction) {
            return;
        }

        setRefunding(true);
        try {
            await onRefund(transaction.id);
            // Don't show toast here - let the parent component handle it to avoid duplicates
            // Refresh transaction data by closing and reopening
            onClose();
        } catch (error) {
            addToast({
                title: 'Refund Failed',
                description: error instanceof Error ? error.message : 'Failed to process refund',
                variant: 'destructive',
            });
        } finally {
            setRefunding(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return (
                    <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-600 dark:text-gray-400">
                        <Ban className="h-3 w-3 mr-1" />
                        Cancelled
                    </Badge>
                );
            case 'refunded':
                return (
                    <Badge variant="default" className="bg-blue-500">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refunded
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getNetworkBadge = (network?: string) => {
        if (!network) return null;
        const colors: Record<string, string> = {
            mtn: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
            telecel: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            airteltigo: 'bg-red-500/10 text-red-600 dark:text-red-400',
        };
        return (
            <Badge className={colors[network] || ''}>
                {network.charAt(0).toUpperCase() + network.slice(1)}
            </Badge>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Transaction Details</span>
                        {getStatusBadge(transaction.status)}
                    </DialogTitle>
                    <DialogDescription>
                        Reference: <span className="font-mono">{transaction.reference}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span>Amount</span>
                            </div>
                            <p className="text-lg font-semibold">
                                GHS {Number(transaction.amount).toFixed(2)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Package className="h-4 w-4" />
                                <span>Type</span>
                            </div>
                            <p className="text-sm font-medium capitalize">{transaction.type}</p>
                        </div>
                    </div>

                    <Separator />

                    {transaction.package && (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Package className="h-4 w-4" />
                                    <span>Package</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">{transaction.package.name}</p>
                                    <div className="flex items-center gap-2">
                                        {getNetworkBadge(transaction.package.network)}
                                        <span className="text-sm text-muted-foreground">
                                            {transaction.package.data_size}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {transaction.user && (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>User</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">{transaction.user.name}</p>
                                    {transaction.user.email && (
                                        <p className="text-sm text-muted-foreground">
                                            {transaction.user.email}
                                        </p>
                                    )}
                                    {transaction.user.phone && (
                                        <p className="text-sm text-muted-foreground">
                                            {transaction.user.phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {transaction.phone_number && (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span>Recipient Phone</span>
                                </div>
                                <p className="font-medium">{transaction.phone_number}</p>
                            </div>
                            <Separator />
                        </>
                    )}

                    {transaction.network && (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Network</span>
                                </div>
                                <div>{getNetworkBadge(transaction.network)}</div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {transaction.vendor_reference && (
                        <>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Vendor Reference</div>
                                <p className="font-mono text-sm">{transaction.vendor_reference}</p>
                            </div>
                            <Separator />
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Created</span>
                            </div>
                            <p className="text-sm">
                                {new Date(transaction.created_at).toLocaleString()}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Updated</span>
                            </div>
                            <p className="text-sm">
                                {new Date(transaction.updated_at).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {transaction.vendor_response && Object.keys(transaction.vendor_response).length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Vendor Response</div>
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                                    {JSON.stringify(transaction.vendor_response, null, 2)}
                                </pre>
                            </div>
                        </>
                    )}

                    {onStatusUpdate && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <div className="text-sm font-medium">Update Status</div>
                                <div className="flex items-center gap-3">
                                    <Select
                                        value={selectedStatus}
                                        onValueChange={setSelectedStatus}
                                        disabled={updating || refunding}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4" />
                                                    Pending
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="success">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Success
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="failed">
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="h-4 w-4" />
                                                    Failed
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="cancelled">
                                                <div className="flex items-center gap-2">
                                                    <Ban className="h-4 w-4" />
                                                    Cancelled
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="refunded">
                                                <div className="flex items-center gap-2">
                                                    <RefreshCw className="h-4 w-4" />
                                                    Refunded
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={handleStatusUpdate}
                                        disabled={updating || refunding || selectedStatus === transaction.status}
                                        size="sm"
                                    >
                                        {updating && <Spinner />}
                                        {updating ? 'Updating...' : 'Update Status'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Refund Button - Only show for failed/pending purchase transactions */}
                    {onRefund && transaction.type === 'purchase' && 
                     (transaction.status === 'failed' || transaction.status === 'pending') &&
                     transaction.status !== 'refunded' && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <div className="text-sm font-medium">Refund</div>
                                <p className="text-sm text-muted-foreground">
                                    Refund the user's wallet for this failed transaction. This will mark the transaction as refunded.
                                </p>
                                <Button
                                    onClick={handleRefund}
                                    disabled={refunding || updating}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {refunding && <Spinner />}
                                    {refunding ? 'Processing Refund...' : 'Refund to Wallet'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
                {onStatusUpdate && (
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

