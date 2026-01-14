import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    detectNetwork,
    getNetworkName,
    getNetworkColor,
    formatPhoneForDisplay,
} from '@/services/authService';
import {
    initiateDirectPayment,
    fundWalletAndPurchase,
    redirectToPayment,
    type GuestPurchaseRequest,
} from '@/services/paymentService';
import { ShoppingCart, Phone, CreditCard } from 'lucide-react';

interface DataPackage {
    id: number;
    network: string;
    name: string;
    data_size: string;
    price: number | string;
    validity: string;
}

interface CheckoutProps {
    package: DataPackage;
}

type Step = 'details' | 'payment';

export default function Checkout({ package: pkg }: CheckoutProps) {
    const [step, setStep] = useState<Step>('details');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [paymentPhone, setPaymentPhone] = useState('');
    const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPhoneNumber(value);
        if (value.length >= 3) {
            const detected = detectNetwork(value);
            setDetectedNetwork(detected);
            if (detected && detected !== pkg.network) {
                setError('Phone number network does not match package network');
            } else {
                setError(null);
            }
        }
    };

    const handlePaymentPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentPhone(e.target.value);
    };

    const handleNext = () => {
        if (!phoneNumber) {
            setError('Please enter recipient phone number');
            return;
        }

        if (detectedNetwork && detectedNetwork !== pkg.network) {
            setError('Phone number network does not match package network');
            return;
        }

        setError(null);
        setStep('payment');
    };

    const handlePurchase = async () => {
        if (!paymentMethod) {
            setError('Please select a payment method');
            return;
        }

        if (paymentMethod !== 'wallet' && !paymentPhone) {
            setError('Please enter payment phone number');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const purchaseData: GuestPurchaseRequest = {
                package_id: pkg.id,
                network: pkg.network,
                phone_number: phoneNumber,
                payment_method: paymentMethod as any,
                payment_phone: paymentMethod !== 'wallet' ? paymentPhone : undefined,
            };

            let result;

            if (paymentMethod === 'wallet') {
                // For wallet, we need to fund first then purchase
                // In a real implementation, you'd handle this flow differently
                setError('Wallet funding flow requires authentication. Please use direct payment or sign in.');
                setLoading(false);
                return;
            } else {
                // Direct payment
                result = await initiateDirectPayment(purchaseData);
            }

            if (result.requires_payment && result.payment_url) {
                // Redirect to payment gateway
                redirectToPayment(result.payment_url);
            } else if (result.message) {
                // Success or other status
                router.visit('/', {
                    data: {
                        success: true,
                        message: result.message,
                        transaction_reference: result.transaction_reference,
                    },
                });
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to process purchase. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <Head title="Checkout" />
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Complete Your Purchase
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Enter recipient details and choose payment method
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Package Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Package Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Package Name</p>
                                <p className="font-semibold">{pkg.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Data Size</p>
                                <p className="font-semibold">{pkg.data_size}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Network</p>
                                <Badge
                                    className={`${getNetworkColor(pkg.network)} text-white mt-1`}
                                >
                                    {getNetworkName(pkg.network)}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Validity</p>
                                <p className="font-semibold">{pkg.validity}</p>
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">Total Price</p>
                                <p className="text-2xl font-bold">
                                    GHS {Number(pkg.price).toFixed(2)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Checkout Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {step === 'details' ? 'Recipient Details' : 'Payment Method'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {step === 'details' ? (
                                <>
                                    <div className="grid gap-2">
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
                                            />
                                        </div>
                                        {detectedNetwork && (
                                            <p className="text-xs text-muted-foreground">
                                                Detected: {getNetworkName(detectedNetwork)}
                                            </p>
                                        )}
                                    </div>

                                    <InputError message={error || undefined} />

                                    <Button
                                        onClick={handleNext}
                                        className="w-full"
                                        disabled={!phoneNumber || loading}
                                    >
                                        Continue to Payment
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="payment_method">Payment Method</Label>
                                        <Select
                                            value={paymentMethod}
                                            onValueChange={setPaymentMethod}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="mtn_momo">
                                                    MTN Mobile Money
                                                </SelectItem>
                                                <SelectItem value="telecel_cash">
                                                    Telecel Cash
                                                </SelectItem>
                                                <SelectItem value="airteltigo_money">
                                                    AirtelTigo Money
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {paymentMethod && paymentMethod !== 'wallet' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="payment_phone">
                                                Payment Phone Number
                                            </Label>
                                            <div className="relative">
                                                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="payment_phone"
                                                    type="tel"
                                                    placeholder="0244123456 or 233244123456"
                                                    value={paymentPhone}
                                                    onChange={handlePaymentPhoneChange}
                                                    className="pl-10"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Phone number to charge for payment
                                            </p>
                                        </div>
                                    )}

                                    <InputError message={error || undefined} />

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setStep('details')}
                                            className="flex-1"
                                            disabled={loading}
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handlePurchase}
                                            className="flex-1"
                                            disabled={loading || !paymentMethod}
                                        >
                                            {loading && <Spinner />}
                                            {loading ? 'Processing...' : 'Complete Purchase'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


