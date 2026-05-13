import { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getNetworkName, getNetworkColor } from '@/services/authService';

export interface PackageCardPackage {
    id: number;
    name: string;
    data_size: string;
    network: string;
    validity: string;
    vendor_price: number | string;
    price?: number | string;
}

interface PackageCardProps {
    package: PackageCardPackage;
    variant: 'display' | 'config' | 'configLarge';
    storePrice?: number | null;
    onSavePrice?: (price: number) => Promise<void>;
    /** Optional footer for display variant (e.g. Buy Now link) */
    footer?: React.ReactNode;
}

export function PackageCard({
    package: pkg,
    variant,
    storePrice = null,
    onSavePrice,
    footer,
}: PackageCardProps) {
    const [priceInput, setPriceInput] = useState<string>(
        storePrice != null ? String(storePrice) : ''
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setPriceInput(storePrice != null ? String(storePrice) : '');
    }, [storePrice]);

    const minPrice = Number(pkg.vendor_price);
    const displayPrice = variant === 'display' ? Number(pkg.price ?? 0) : null;

    const handleSave = async () => {
        if ((variant !== 'config' && variant !== 'configLarge') || !onSavePrice) return;
        const value = parseFloat(priceInput);
        if (Number.isNaN(value)) {
            setError('Enter a valid price');
            return;
        }
        if (value < minPrice) {
            setError(`Price must be at least GHS ${minPrice.toFixed(2)} (min price)`);
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await onSavePrice(value);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save price');
        } finally {
            setSaving(false);
        }
    };

    const networkName = getNetworkName(pkg.network);
    const networkColor = getNetworkColor(pkg.network);
    const isConfigLarge = variant === 'configLarge';
    const currentPrice = storePrice != null ? Number(storePrice) : null;
    const isPriceSet = currentPrice != null && !Number.isNaN(currentPrice);

    if (isConfigLarge) {
        return (
            <Card className="overflow-hidden rounded-xl border bg-card shadow-sm dark:border-border">
                <div className="flex gap-4 p-4 sm:p-5">
                    <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white ${networkColor}`}
                    >
                        {networkName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-2xl font-bold tracking-tight">{pkg.data_size}</span>
                            {!isPriceSet && (
                                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                                    NOT SET
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground">Valid {pkg.validity}</p>
                    </div>
                </div>
                <div className="border-t bg-muted/30 px-4 py-3 dark:bg-muted/20 sm:px-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Cost
                    </p>
                    <p className="text-lg font-semibold">GHS {minPrice.toFixed(2)}</p>
                    {isPriceSet && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your price: GHS {currentPrice.toFixed(2)}
                        </p>
                    )}
                </div>
                {onSavePrice && (
                    <CardFooter className="flex flex-col gap-2 border-t bg-muted/20 px-4 py-4 dark:bg-muted/10 sm:px-5">
                        <div className="space-y-1">
                            <Label htmlFor={`price-large-${pkg.id}`} className="text-xs">
                                Your price (GHS)
                            </Label>
                            <Input
                                id={`price-large-${pkg.id}`}
                                type="number"
                                min={minPrice}
                                step="0.01"
                                value={priceInput}
                                onChange={(e) => {
                                    setPriceInput(e.target.value);
                                    setError(null);
                                }}
                                placeholder={minPrice.toFixed(2)}
                                className="max-w-xs"
                            />
                            {error && (
                                <p className="text-xs text-destructive">{error}</p>
                            )}
                        </div>
                        <Button
                            className="w-full sm:w-auto"
                            size="sm"
                            onClick={handleSave}
                            disabled={saving || !priceInput.trim()}
                        >
                            {saving ? 'Saving...' : 'Set price'}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{pkg.name}</CardTitle>
                    <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${networkColor}`}
                    >
                        {networkName}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground">
                    {pkg.data_size} · Valid {pkg.validity}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {variant === 'display' && (
                    <p className="text-xl font-semibold">
                        GHS {displayPrice != null ? displayPrice.toFixed(2) : '0.00'}
                    </p>
                )}
                {variant === 'config' && (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                            Min price: GHS {minPrice.toFixed(2)}
                        </p>
                        <div className="space-y-1">
                            <Label htmlFor={`price-${pkg.id}`}>Your price (GHS)</Label>
                            <Input
                                id={`price-${pkg.id}`}
                                type="number"
                                min={minPrice}
                                step="0.01"
                                value={priceInput}
                                onChange={(e) => {
                                    setPriceInput(e.target.value);
                                    setError(null);
                                }}
                                placeholder={minPrice.toFixed(2)}
                            />
                            {error && (
                                <p className="text-xs text-destructive">{error}</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            {variant === 'config' && onSavePrice && (
                <CardFooter className="pt-0">
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !priceInput.trim()}
                    >
                        {saving ? 'Saving...' : 'Save price'}
                    </Button>
                </CardFooter>
            )}
            {variant === 'display' && footer && (
                <CardFooter className="pt-0">{footer}</CardFooter>
            )}
        </Card>
    );
}
