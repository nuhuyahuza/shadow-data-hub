import { useState, useEffect, useRef } from 'react';
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
import { initiateDirectPayment, type GuestPurchaseRequest } from '@/services/paymentService';

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

export default function PurchaseModal({ isOpen, onClose, package: pkg }: PurchaseModalProps) {
    const [step, setStep] = useState<Step>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paystackLoaded, setPaystackLoaded] = useState(false);
    const [transactionReference, setTransactionReference] = useState<string | null>(null);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const iframeContainerRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
            // Clear polling interval
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        }
    }, [isOpen]);

    // Poll for payment status when in payment step
    useEffect(() => {
        if (step === 'payment' && transactionReference) {
            // Start polling immediately, then every 2 seconds
            const pollStatus = async () => {
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
                            if (pollIntervalRef.current) {
                                clearInterval(pollIntervalRef.current);
                                pollIntervalRef.current = null;
                            }
                            setStep('success');
                        } else if (statusData.status === 'failed') {
                            if (pollIntervalRef.current) {
                                clearInterval(pollIntervalRef.current);
                                pollIntervalRef.current = null;
                            }
                            setError('Payment failed. Please try again.');
                            setStep('phone');
                        }
                    }
                } catch (err) {
                    // Ignore polling errors, but log them
                    console.error('Payment status check error:', err);
                }
            };

            // Poll immediately, then every 2 seconds
            pollStatus();
            pollIntervalRef.current = setInterval(pollStatus, 2000);

            // Cleanup on unmount
            return () => {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
            };
        }
    }, [step, transactionReference]);

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
            // Initialize payment with backend
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

            if (result.transaction_reference && result.payment_url) {
                setTransactionReference(result.transaction_reference);
                setPaymentUrl(result.payment_url);
                setStep('payment');
                setLoading(false);
                // Polling will be handled by useEffect
            } else {
                // Fallback if Paystack isn't loaded or payment URL is provided
                if (result.payment_url) {
                    window.location.href = result.payment_url;
                } else {
                    throw new Error(
                        result.public_key
                            ? 'Paystack payment initialization failed. Please refresh and try again.'
                            : 'Payment gateway not configured. Please contact support.'
                    );
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initialize payment');
            setStep('phone');
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (step === 'success') {
            // If on success step, close and reload to show updated state
            onClose();
            window.location.reload();
        } else {
            onClose();
        }
    };

    if (!pkg) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'phone' && 'Complete Your Purchase'}
                        {step === 'payment' && 'Complete Payment'}
                        {step === 'success' && 'Payment Successful'}
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

                        {/* Paystack iframe container */}
                        <div
                            ref={iframeContainerRef}
                            className="w-full min-h-[500px] border rounded-lg overflow-hidden bg-white"
                            id="paystack-iframe-container"
                        >
                            {paymentUrl ? (
                                <iframe
                                    src={paymentUrl}
                                    className="w-full h-[500px] border-0"
                                    title="Paystack Payment"
                                    allow="payment *"
                                    id="paystack-iframe"
                                    style={{ minHeight: '500px' }}
                                    onLoad={() => {
                                        // Listen for URL changes in iframe to detect payment completion
                                        const iframe = document.getElementById('paystack-iframe') as HTMLIFrameElement;
                                        if (iframe) {
                                            try {
                                                // Check if iframe URL contains success indicators
                                                const iframeSrc = iframe.src;
                                                if (iframeSrc.includes('success') || iframeSrc.includes('callback')) {
                                                    // Payment might be complete, check status
                                                    if (transactionReference) {
                                                        fetch(`/api/guest/payment/status/${transactionReference}`, {
                                                            credentials: 'include',
                                                        })
                                                            .then((res) => res.json())
                                                            .then((data) => {
                                                                if (data.status === 'success') {
                                                                    setStep('success');
                                                                }
                                                            })
                                                            .catch(() => {
                                                                // Ignore errors
                                                            });
                                                    }
                                                }
                                            } catch (e) {
                                                // Cross-origin restrictions - this is expected
                                                // We'll rely on polling instead
                                            }
                                        }
                                    }}
                                />
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
                        </div>

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

                        <Button onClick={handleClose} className="w-full">
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

