import { useState, useEffect } from 'react';
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
import InputError from '@/components/input-error';
import { Phone } from 'lucide-react';
import {
    detectNetwork,
    getNetworkName,
    getNetworkColor,
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

type Step = 'phone' | 'processing';

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
        }
    }, [isOpen]);

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
        setStep('processing');

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

            if (result.transaction_reference && window.PaystackPop && result.public_key) {
                // Initialize Paystack payment
                const handler = window.PaystackPop.setup({
                    key: result.public_key,
                    email: `${phoneNumber.replace(/\D/g, '')}@datahub.gh`, // Use phone as email identifier
                    amount: Number(pkg.price) * 100, // Convert to pesewas (GHS * 100)
                    currency: 'GHS',
                    ref: result.transaction_reference,
                    metadata: {
                        custom_fields: [
                            {
                                display_name: 'Recipient Phone',
                                variable_name: 'recipient_phone',
                                value: phoneNumber,
                            },
                            {
                                display_name: 'Package',
                                variable_name: 'package_name',
                                value: pkg.name,
                            },
                        ],
                    },
                    callback: (response) => {
                        // Payment successful
                        if (response.status === 'success') {
                            // Close modal and show success
                            onClose();
                            // You might want to show a success toast here
                            alert('Payment successful! Your data bundle will be delivered shortly.');
                            window.location.reload(); // Or navigate to success page
                        }
                    },
                    onClose: () => {
                        // User closed Paystack modal
                        setStep('phone');
                        setLoading(false);
                    },
                });

                handler.openIframe();
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
        } finally {
            setLoading(false);
        }
    };

    if (!pkg) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
                <DialogHeader>
                    <DialogTitle>Complete Your Purchase</DialogTitle>
                    <DialogDescription>
                        Enter the phone number to receive the data bundle
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
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <Spinner />
                        <p className="text-sm text-muted-foreground">
                            Initializing payment...
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
