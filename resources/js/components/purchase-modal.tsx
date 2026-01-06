import { useState, useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import InputError from '@/components/input-error';
import { Phone, CheckCircle2 } from 'lucide-react';
import {
    detectNetwork,
    getNetworkName,
    getNetworkColor,
    formatPhoneForDisplay,
} from '@/services/authService';
import {
    initiateDirectPayment,
    purchaseWithWallet,
    type GuestPurchaseRequest,
    type WalletPurchaseRequest,
} from '@/services/paymentService';
import { useToast } from '@/components/ui/toast';
import { type SharedData } from '@/types';

interface DataPackage {
    id: number;
    network: string;
    name: string;
    data_size: string;
    price: number | string;
    validity: string;
}

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    package: DataPackage | null;
    onSuccess?: () => void;
    useWallet?: boolean; // If true, use wallet-based purchase for authenticated users
}

type Step = 'phone' | 'payment' | 'success';

declare global {
    interface Window {
        PaystackPop: {
            setup: (options: {
                key: string;
                email: string;
                amount: number;
                currency?: string;
                ref: string;
                metadata?: {
                    custom_fields?: Array<{
                        display_name: string;
                        variable_name: string;
                        value: string;
                    }>;
                };
                callback: (response: { reference: string; status: string }) => void;
                onClose: () => void;
                embed?: boolean;
                container?: string;
            }) => {
                openIframe: () => void;
            };
        };
    }
}

export default function PurchaseModal({
    isOpen,
    onClose,
    package: pkg,
    onSuccess,
    useWallet = true,
}: PurchaseModalProps) {
    const { addToast } = useToast();
    const page = usePage<SharedData>();
    const user = page.props.auth?.user;
    // Check if user is authenticated and is admin/agent
    const isAdminOrAgent = user && (user.role === 'admin' || user.role === 'agent');

    const [step, setStep] = useState<Step>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paystackLoaded, setPaystackLoaded] = useState(false);
    const [transactionReference, setTransactionReference] = useState<string | null>(null);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [paymentDisplay, setPaymentDisplay] = useState<{
        type?: string;
        message?: string;
        message_dial?: string;
        message_prompt?: string;
        timer?: number;
    } | null>(null);
    const iframeContainerRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isPollingRef = useRef<boolean>(false);
    const toastShownRef = useRef<string | null>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load Paystack script
    useEffect(() => {
        if (isOpen) {
            // Check if script already exists
            const existingScript = document.querySelector('script[src*="paystack"]');
            if (existingScript && window.PaystackPop) {
                setPaystackLoaded(true);
                return;
            }

            if (!existingScript) {
                const script = document.createElement('script');
                script.src = 'https://js.paystack.co/v1/inline.js';
                script.async = true;
                script.onload = () => {
                    setPaystackLoaded(true);
                };
                script.onerror = () => {
                    setError('Failed to load payment gateway. Please refresh and try again.');
                };
                document.body.appendChild(script);
            }
        }
    }, [isOpen]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('phone');
            setPhoneNumber('');
            setDetectedNetwork(null);
            setError(null);
            setLoading(false);
            setTransactionReference(null);
            setPaymentUrl(null);
            setPaymentDisplay(null);
            // Stop polling
            isPollingRef.current = false;
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            // Clear close timeout
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }
            // Reset toast tracking
            toastShownRef.current = null;
        }
    }, [isOpen]);

    // Show toast notification when payment processing starts (only for direct payments, not wallet purchases)
    useEffect(() => {
        // Only show toast for direct payments (when paymentUrl or paymentDisplay exists)
        // Wallet purchases are instant and go directly to success
        if (step === 'payment' && transactionReference && (paymentUrl || paymentDisplay) && !isAdminOrAgent) {
            // Show toast only once per transaction reference
            if (toastShownRef.current !== transactionReference) {
                toastShownRef.current = transactionReference;
                addToast({
                    title: 'Payment Processing',
                    description: 'Your data will be credited shortly. Please wait while we confirm your payment.',
                    variant: 'default',
                });
            }
        }
    }, [step, transactionReference, paymentUrl, paymentDisplay, isAdminOrAgent, addToast]);

    // Poll for payment status when in payment step (only for direct payment, not wallet purchases)
    useEffect(() => {
        // Clear any existing interval first
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        isPollingRef.current = false;

        // Only poll for direct payments (when paymentUrl or paymentDisplay exists)
        // Wallet purchases are instant and don't need polling
        if (step === 'payment' && transactionReference && (paymentUrl || paymentDisplay) && !isPollingRef.current) {
            isPollingRef.current = true;

            // Start polling immediately, then every 3 seconds
            const pollStatus = async () => {
                // Prevent concurrent requests
                if (!isPollingRef.current) {
                    return;
                }

                try {
                    const checkResponse = await fetch(
                        `/api/guest/payment/status/${transactionReference}`,
                        {
                            credentials: 'include',
                        }
                    );
                    if (checkResponse.ok) {
                        const statusData = await checkResponse.json();
                        if (statusData.status === 'success') {
                            // Stop polling
                            isPollingRef.current = false;
                            if (pollIntervalRef.current) {
                                clearInterval(pollIntervalRef.current);
                                pollIntervalRef.current = null;
                            }
                            setStep('success');
                            // Show success toast
                            addToast({
                                title: 'Transaction Successful',
                                description: 'Your data bundle purchase was successful',
                                variant: 'success',
                            });
                            // Call onSuccess callback
                            if (onSuccess) {
                                onSuccess();
                            }
                            // Auto-close modal after 3 seconds
                            closeTimeoutRef.current = setTimeout(() => {
                                handleClose();
                            }, 3000);
                        } else if (statusData.status === 'failed') {
                            // Stop polling
                            isPollingRef.current = false;
                            if (pollIntervalRef.current) {
                                clearInterval(pollIntervalRef.current);
                                pollIntervalRef.current = null;
                            }
                            setError('Payment failed. Please try again.');
                            setStep('phone');
                        }
                        // If still pending, continue polling
                    }
                } catch (err) {
                    // Ignore polling errors, but log them
                    console.error('Payment status check error:', err);
                }
            };

            // Poll immediately, then every 3 seconds (reduced frequency)
            pollStatus();
            pollIntervalRef.current = setInterval(pollStatus, 3000);

            // Cleanup on unmount or when dependencies change
            return () => {
                isPollingRef.current = false;
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
            };
        } else {
            // Not in payment step, ensure polling is stopped
            isPollingRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, transactionReference, paymentUrl, paymentDisplay]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPhoneNumber(value);
        if (value.length >= 3) {
            const detected = detectNetwork(value);
            setDetectedNetwork(detected);
            if (detected && pkg && detected !== pkg.network) {
                setError('Phone number network does not match package network');
            } else {
                setError(null);
            }
        }
    };

    const handleProceedToPayment = async () => {
        if (!pkg || !phoneNumber) {
            setError('Please enter recipient phone number');
            return;
        }

        if (detectedNetwork && detectedNetwork !== pkg.network) {
            setError('Phone number network does not match package network');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use wallet-based purchase for authenticated users if useWallet is true
            if (useWallet) {
                // Generate idempotency key for wallet purchase
                const idempotencyKey = `WALLET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                const purchaseData: WalletPurchaseRequest = {
                    package_id: pkg.id,
                    network: pkg.network,
                    phone_number: phoneNumber,
                    idempotency_key: idempotencyKey,
                };

                const result = await purchaseWithWallet(purchaseData);

                // If idempotent and already successful, show success step
                if (result.idempotent && result.status === 'success') {
                    setTransactionReference(result.transaction_reference);
                    setStep('success');
                    setLoading(false);
                    // Show success toast
                    addToast({
                        title: 'Transaction Successful',
                        description: 'Your data bundle purchase was successful',
                        variant: 'success',
                    });
                    // Call onSuccess callback
                    if (onSuccess) {
                        onSuccess();
                    }
                    // Auto-close modal after 3 seconds
                    closeTimeoutRef.current = setTimeout(() => {
                        handleClose();
                    }, 3000);
                    return;
                }

                // If requires funding, show error
                if (result.requires_funding) {
                    setError(
                        `Insufficient wallet balance. You need GHS ${result.required_amount?.toFixed(2)} but have GHS ${result.current_balance?.toFixed(2)}.`
                    );
                    setLoading(false);
                    return;
                }

                // Wallet purchases are instant - either success or failure
                // If pending, it means manual processing is required, but money is already deducted
                // Show success message since payment was successful
                if (result.status === 'pending' || result.status === 'success') {
                    setTransactionReference(result.transaction_reference);
                    setStep('success');
                    setLoading(false);
                    // Show success toast
                    addToast({
                        title: 'Transaction Successful',
                        description: 'Your data bundle purchase was successful',
                        variant: 'success',
                    });
                    // Call onSuccess callback
                    if (onSuccess) {
                        onSuccess();
                    }
                    // Auto-close modal after 3 seconds
                    closeTimeoutRef.current = setTimeout(() => {
                        handleClose();
                    }, 3000);
                    return;
                }

                // If we have a transaction reference but status is not success/pending, it failed
                if (result.transaction_reference) {
                    setError(result.message || 'Purchase failed. Please try again.');
                    setLoading(false);
                    return;
                }
            } else {
                // Guest purchase flow (direct payment)
                const purchaseData: GuestPurchaseRequest = {
                    package_id: pkg.id,
                    network: pkg.network,
                    phone_number: phoneNumber,
                    payment_method: 'direct',
                };

                const result = await initiateDirectPayment(purchaseData);

                // Wait for Paystack to load if not already loaded
                if (!paystackLoaded) {
                    await new Promise((resolve) => {
                        let attempts = 0;
                        const maxAttempts = 50; // 5 seconds max wait
                        const checkPaystack = setInterval(() => {
                            attempts++;
                            if (window.PaystackPop) {
                                clearInterval(checkPaystack);
                                setPaystackLoaded(true);
                                resolve(true);
                            } else if (attempts >= maxAttempts) {
                                clearInterval(checkPaystack);
                                resolve(false);
                            }
                        }, 100);
                    });
                }

                if (result.transaction_reference) {
                    setTransactionReference(result.transaction_reference);
                    
                    // Handle mobile money payment (with display instructions)
                    if (result.payment_method === 'mobile_money' && result.display) {
                        setPaymentDisplay(result.display);
                        setStep('payment');
                        setLoading(false);
                    } 
                    // Handle card payment (with iframe URL)
                    else if (result.payment_url) {
                        setPaymentUrl(result.payment_url);
                        setStep('payment');
                        setLoading(false);
                    } else {
                        throw new Error('Payment initialization failed. No payment URL or instructions provided.');
                    }
                    // Polling will be handled by useEffect
                } else {
                    throw new Error('Payment initialization failed. No transaction reference received.');
                }
            }
        } catch (err: unknown) {
            // Handle error response with requires_funding
            const error = err as { requires_funding?: boolean; required_amount?: number; current_balance?: number; message?: string };
            if (error.requires_funding) {
                setError(
                    `Insufficient wallet balance. You need GHS ${error.required_amount?.toFixed(2)} but have GHS ${error.current_balance?.toFixed(2)}.`
                );
            } else {
                setError(error.message || (err instanceof Error ? err.message : 'Failed to initialize payment'));
            }
            setStep('phone');
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Stop polling
        isPollingRef.current = false;
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        // Clear close timeout
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        
        // Call onSuccess if on success step
        if (step === 'success' && onSuccess) {
            onSuccess();
        }
        
        // Close modal first - state will be reset in useEffect when isOpen becomes false
        onClose();
    };

    if (!pkg) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                handleClose();
            }
        }}>
            <DialogContent className="sm:max-w-md backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'phone' && 'Complete Your Purchase'}
                        {step === 'payment' && 'Complete Payment'}
                        {step === 'success' && 'Transaction Successful'}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'phone' && 'Enter the phone number to receive the data bundle'}
                        {step === 'payment' && 'Complete your payment using the form below'}
                        {step === 'success' && 'Your data bundle purchase was successful'}
                    </DialogDescription>
                </DialogHeader>

                {step === 'phone' ? (
                    <div className="space-y-6">
                        {/* Package Summary */}
                        <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-semibold">{pkg.name}</h4>
                                    <p className="text-sm text-muted-foreground">{pkg.data_size}</p>
                                </div>
                                <Badge
                                    className={`${getNetworkColor(pkg.network)} text-white`}
                                >
                                    {getNetworkName(pkg.network)}
                                </Badge>
                            </div>
                            <div className="flex items-baseline justify-between pt-3 border-t">
                                <span className="text-sm text-muted-foreground">Total</span>
                                <span className="text-2xl font-bold">
                                    GHS {Number(pkg.price).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Phone Input */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">Recipient Phone Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="0244123456 or 233244123456"
                                    value={phoneNumber}
                                    onChange={handlePhoneChange}
                                    className="pl-10"
                                    disabled={loading}
                                />
                            </div>
                            {detectedNetwork && (
                                <p className="text-xs text-muted-foreground">
                                    Detected: {getNetworkName(detectedNetwork)}
                                </p>
                            )}
                        </div>

                        <InputError message={error || undefined} />

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleProceedToPayment}
                                className="flex-1"
                                disabled={loading || !phoneNumber}
                            >
                                {loading && <Spinner />}
                                {loading ? 'Processing...' : 'Proceed to Payment'}
                            </Button>
                        </div>
                    </div>
                ) : step === 'payment' ? (
                    <div className="space-y-4">
                        {/* Package Summary (compact) */}
                        <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">{pkg.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatPhoneForDisplay(phoneNumber)}
                                    </p>
                                </div>
                                <span className="text-lg font-bold">
                                    GHS {Number(pkg.price).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Show waiting state only for direct payments (mobile money or card) */}
                        {paymentDisplay ? (
                            /* Mobile Money Payment Instructions */
                            <div className="space-y-4">
                                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                                    <AlertTitle className="text-blue-800 dark:text-blue-200">
                                        Complete Payment on Your Phone
                                    </AlertTitle>
                                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                                        <div className="space-y-3 mt-2">
                                            {paymentDisplay.message_dial && (
                                                <p className="font-semibold">
                                                    {paymentDisplay.message_dial}
                                                </p>
                                            )}
                                            {paymentDisplay.message_prompt && (
                                                <p>{paymentDisplay.message_prompt}</p>
                                            )}
                                            {paymentDisplay.message && !paymentDisplay.message_dial && (
                                                <p>{paymentDisplay.message}</p>
                                            )}
                                            {paymentDisplay.timer && (
                                                <p className="text-xs">
                                                    You have {paymentDisplay.timer} seconds to complete this payment.
                                                </p>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>

                                <div className="flex items-center justify-center py-4">
                                    <Spinner />
                                </div>

                        <p className="text-sm text-center text-muted-foreground">
                            Waiting for payment confirmation... Please complete the payment on your mobile device.
                        </p>
                    </div>
                ) : paymentUrl ? (
                    /* Card Payment iframe */
                    <div
                        ref={iframeContainerRef}
                        className="w-full min-h-[500px] border rounded-lg overflow-hidden bg-white"
                        id="paystack-iframe-container"
                    >
                        <iframe
                            src={paymentUrl}
                            className="w-full h-[500px] border-0"
                            title="Paystack Payment"
                            allow="payment *"
                            id="paystack-iframe"
                            style={{ minHeight: '500px' }}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-[500px]">
                        <div className="text-center space-y-2">
                            <Spinner />
                            <p className="text-sm text-muted-foreground">
                                Loading payment form...
                            </p>
                        </div>
                    </div>
                )}

                {/* Only show cancel button for direct payments (not wallet purchases) */}
                {(paymentUrl || paymentDisplay) && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStep('phone');
                                setLoading(false);
                            }}
                            className="w-full"
                        >
                            Cancel Payment
                        </Button>
                    </div>
                )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Success Message */}
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <AlertTitle className="text-green-800 dark:text-green-200">
                                Data Purchase Successful!
                            </AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                <div className="space-y-2 mt-2">
                                    <p>
                                        Your payment has been confirmed and your data bundle will be
                                        delivered to{' '}
                                        <span className="font-semibold">
                                            {formatPhoneForDisplay(phoneNumber)}
                                        </span>{' '}
                                        shortly.
                                    </p>
                                    {transactionReference && (
                                        <p className="text-xs">
                                            Transaction Reference: {transactionReference}
                                        </p>
                                    )}
                                </div>
                            </AlertDescription>
                        </Alert>

                        {/* Package Summary */}
                        <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-semibold">{pkg.name}</h4>
                                    <p className="text-sm text-muted-foreground">{pkg.data_size}</p>
                                </div>
                                <Badge
                                    className={`${getNetworkColor(pkg.network)} text-white`}
                                >
                                    {getNetworkName(pkg.network)}
                                </Badge>
                            </div>
                            <div className="flex items-baseline justify-between pt-3 border-t">
                                <span className="text-sm text-muted-foreground">Amount Paid</span>
                                <span className="text-xl font-bold">
                                    GHS {Number(pkg.price).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <p className="text-sm text-center text-muted-foreground">
                                This window will close automatically in a few seconds...
                            </p>
                            <Button onClick={handleClose} variant="outline" className="w-full">
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

