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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import InputError from '@/components/input-error';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import {
    fundWallet,
    checkTransactionStatus,
    type FundWalletRequest,
} from '@/services/walletService';

interface WalletFundingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type Step = 'amount' | 'payment' | 'success';

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

export default function WalletFundingModal({
    isOpen,
    onClose,
    onSuccess,
}: WalletFundingModalProps) {
    const [step, setStep] = useState<Step>('amount');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<
        'mtn_momo' | 'telecel_cash' | 'airteltigo_money'
    >('mtn_momo');
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
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const iframeContainerRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isPollingRef = useRef<boolean>(false);
    const { addToast } = useToast();

    // Load Paystack script
    useEffect(() => {
        if (isOpen) {
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
                document.body.appendChild(script);
            }
        }
    }, [isOpen]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('amount');
            setAmount('');
            setPaymentMethod('mtn_momo');
            setError(null);
            setTransactionReference(null);
            setPaymentUrl(null);
            setPaymentDisplay(null);
            setPublicKey(null);
            setCheckingStatus(false);
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            isPollingRef.current = false;
        }
    }, [isOpen]);

    const handleFundWallet = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const fundData: FundWalletRequest = {
                amount: parseFloat(amount),
                payment_method: paymentMethod,
            };

            const result = await fundWallet(fundData);

            if (result.success && result.reference) {
                setTransactionReference(result.reference);
                setPublicKey(result.public_key || null);

                // Handle mobile money payment (with display instructions)
                if (result.payment_method === 'mobile_money' && result.display) {
                    setPaymentDisplay(result.display);
                    setStep('payment');
                    setLoading(false);
                    // Start polling for mobile money
                    startPolling(result.reference);
                }
                // Handle card payment (with payment URL)
                else if (result.payment_url && result.public_key) {
                    setPaymentUrl(result.payment_url);
                    setStep('payment');
                    setLoading(false);
                    // Initialize Paystack popup for card payment
                    initializePaystackCard(result.public_key, result.payment_url, result.reference);
                } else {
                    throw new Error('Payment initialization failed. No payment URL or instructions provided.');
                }
            } else {
                throw new Error(result.message || 'Failed to initialize payment');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fund wallet');
            setLoading(false);
            addToast({
                title: 'Payment Error',
                description: err instanceof Error ? err.message : 'Failed to initialize payment',
                variant: 'destructive',
            });
        }
    };

    const initializePaystackCard = (
        key: string,
        url: string,
        reference: string
    ) => {
        if (!paystackLoaded) {
            // Wait for Paystack to load
            const checkPaystack = setInterval(() => {
                if (window.PaystackPop) {
                    clearInterval(checkPaystack);
                    setPaystackLoaded(true);
                    openPaystackIframe(key, url, reference);
                }
            }, 100);
            return;
        }

        openPaystackIframe(key, url, reference);
    };

    const openPaystackIframe = (key: string, url: string, reference: string) => {
        // Extract email from URL or use a default
        const email = 'user@datahub.gh';
        const amountInPesewas = parseFloat(amount) * 100;

        if (window.PaystackPop && iframeContainerRef.current) {
            const handler = window.PaystackPop.setup({
                key,
                email,
                amount: amountInPesewas,
                currency: 'GHS',
                ref: reference,
                callback: async (response) => {
                    if (response.status === 'success') {
                        // Payment completed, show complete transaction button
                        setCheckingStatus(true);
                        await handleCompleteTransaction(reference);
                    }
                },
                onClose: () => {
                    // User closed payment window
                    setError('Payment was cancelled');
                },
                embed: true,
                container: 'paystack-iframe-container',
            });

            handler.openIframe();
        }
    };

    const startPolling = (reference: string) => {
        if (isPollingRef.current) {
            return;
        }

        isPollingRef.current = true;
        let attempts = 0;
        const maxAttempts = 60; // Poll for 5 minutes max

        pollIntervalRef.current = setInterval(async () => {
            attempts++;

            if (attempts >= maxAttempts) {
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
                isPollingRef.current = false;
                return;
            }

            try {
                const statusResult = await checkTransactionStatus(reference);

                if (statusResult.status === 'success') {
                    clearInterval(pollIntervalRef.current!);
                    pollIntervalRef.current = null;
                    isPollingRef.current = false;
                    setStep('success');
                    addToast({
                        title: 'Payment Successful',
                        description: 'Your wallet has been funded successfully!',
                        variant: 'success',
                    });
                    if (onSuccess) {
                        onSuccess();
                    }
                } else if (statusResult.status === 'failed') {
                    clearInterval(pollIntervalRef.current!);
                    pollIntervalRef.current = null;
                    isPollingRef.current = false;
                    setError('Payment failed');
                    addToast({
                        title: 'Payment Failed',
                        description: 'The payment could not be processed',
                        variant: 'destructive',
                    });
                }
            } catch (err) {
                // Continue polling on error
                console.error('Error checking status:', err);
            }
        }, 5000); // Poll every 5 seconds
    };

    const handleCompleteTransaction = async (reference: string) => {
        if (!reference) {
            return;
        }

        setCheckingStatus(true);
        setError(null);

        try {
            const statusResult = await checkTransactionStatus(reference);

            if (statusResult.status === 'success') {
                setStep('success');
                addToast({
                    title: 'Wallet Funded Successfully',
                    description: 'Your balance has been updated.',
                    variant: 'success',
                });
                if (onSuccess) {
                    onSuccess();
                }
                // Auto-close modal after 2 seconds to show success message
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else if (statusResult.status === 'pending') {
                addToast({
                    title: 'Payment Received',
                    description: 'Your account will be funded once the payment is confirmed.',
                    variant: 'default',
                });
            } else if (statusResult.status === 'failed') {
                setError('Payment failed');
                addToast({
                    title: 'Payment Failed',
                    description: 'The payment could not be processed',
                    variant: 'destructive',
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to verify transaction');
            addToast({
                title: 'Verification Error',
                description: err instanceof Error ? err.message : 'Failed to verify transaction',
                variant: 'destructive',
            });
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleClose = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        isPollingRef.current = false;

        if (step === 'success' && onSuccess) {
            onSuccess();
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'amount' && 'Fund Wallet'}
                        {step === 'payment' && 'Complete Payment'}
                        {step === 'success' && 'Payment Successful'}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'amount' && 'Enter the amount you want to add to your wallet'}
                        {step === 'payment' && 'Complete your payment'}
                        {step === 'success' && 'Your wallet has been funded successfully'}
                    </DialogDescription>
                </DialogHeader>

                {step === 'amount' ? (
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount (GHS)</Label>
                            <Input
                                id="amount"
                                type="number"
                                min="1"
                                max="10000"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                disabled={loading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="payment_method">Payment Method</Label>
                            <Select
                                value={paymentMethod}
                                onValueChange={(value) =>
                                    setPaymentMethod(
                                        value as 'mtn_momo' | 'telecel_cash' | 'airteltigo_money'
                                    )
                                }
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mtn_momo">MTN Mobile Money</SelectItem>
                                    <SelectItem value="telecel_cash">Telecel Cash</SelectItem>
                                    <SelectItem value="airteltigo_money">AirtelTigo Money</SelectItem>
                                </SelectContent>
                            </Select>
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
                                onClick={handleFundWallet}
                                className="flex-1"
                                disabled={loading || !amount || parseFloat(amount) <= 0}
                            >
                                {loading && <Spinner />}
                                {loading ? 'Processing...' : 'Fund Wallet'}
                            </Button>
                        </div>
                    </div>
                ) : step === 'payment' ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Wallet Funding</p>
                                    <p className="text-xs text-muted-foreground">
                                        {paymentMethod === 'mtn_momo'
                                            ? 'MTN Mobile Money'
                                            : paymentMethod === 'telecel_cash'
                                              ? 'Telecel Cash'
                                              : 'AirtelTigo Money'}
                                    </p>
                                </div>
                                <span className="text-lg font-bold">
                                    GHS {parseFloat(amount).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Mobile Money Payment Instructions */}
                        {paymentDisplay ? (
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
                                            {paymentDisplay.message &&
                                                !paymentDisplay.message_dial && (
                                                    <p>{paymentDisplay.message}</p>
                                                )}
                                            {paymentDisplay.timer && (
                                                <p className="text-xs">
                                                    You have {paymentDisplay.timer} seconds to
                                                    complete this payment.
                                                </p>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>

                                <div className="flex items-center justify-center py-4">
                                    <Spinner />
                                </div>

                                <p className="text-sm text-center text-muted-foreground">
                                    Waiting for payment confirmation... Please complete the payment
                                    on your mobile device.
                                </p>

                                {transactionReference && (
                                    <Button
                                        onClick={() => handleCompleteTransaction(transactionReference)}
                                        className="w-full"
                                        disabled={checkingStatus}
                                    >
                                        {checkingStatus && <Spinner />}
                                        {checkingStatus
                                            ? 'Checking...'
                                            : 'Complete Transaction'}
                                    </Button>
                                )}
                            </div>
                        ) : paymentUrl ? (
                            /* Card Payment iframe */
                            <div className="space-y-4">
                                <div
                                    ref={iframeContainerRef}
                                    className="w-full min-h-[500px] border rounded-lg overflow-hidden bg-white"
                                    id="paystack-iframe-container"
                                >
                                    <iframe
                                        src={paymentUrl}
                                        className="w-full h-full border-0"
                                        title="Paystack Payment"
                                        id="paystack-iframe"
                                    />
                                </div>

                                {transactionReference && (
                                    <Button
                                        onClick={() => handleCompleteTransaction(transactionReference)}
                                        className="w-full"
                                        disabled={checkingStatus}
                                    >
                                        {checkingStatus && <Spinner />}
                                        {checkingStatus
                                            ? 'Checking...'
                                            : 'Complete Transaction'}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Spinner />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Initializing payment...
                                </p>
                            </div>
                        )}

                        <InputError message={error || undefined} />
                    </div>
                ) : step === 'success' ? (
                    <div className="space-y-4 text-center">
                        <div className="flex justify-center">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Payment Successful</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                Your wallet has been funded with GHS {parseFloat(amount).toFixed(2)}
                            </p>
                        </div>
                        <Button onClick={handleClose} className="w-full">
                            Close
                        </Button>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

