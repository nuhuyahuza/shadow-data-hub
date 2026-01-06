import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import InputError from '@/components/input-error';
import { useToast } from '@/components/ui/toast';
import { Package } from 'lucide-react';

interface CreatePackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function CreatePackageModal({ isOpen, onClose, onSuccess }: CreatePackageModalProps) {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        network: '',
        name: '',
        data_size: '',
        price: '',
        vendor_price: '',
        validity: '',
        is_active: true,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const response = await fetch('/api/admin/packages', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    price: parseFloat(formData.price),
                    vendor_price: parseFloat(formData.vendor_price),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ general: data.message || 'Failed to create package' });
                }
                setLoading(false);
                return;
            }

            // Reset form
            setFormData({
                network: '',
                name: '',
                data_size: '',
                price: '',
                vendor_price: '',
                validity: '',
                is_active: true,
            });
            setErrors({});
            addToast({
                title: 'Package Created',
                description: `Successfully created package: ${data.name}`,
                variant: 'success',
            });
            onSuccess?.();
            onClose();
        } catch (error) {
            setErrors({ general: 'An unexpected error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Create New Package
                    </DialogTitle>
                    <DialogDescription>
                        Add a new data package to the system. All fields are required.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {errors.general && (
                        <div className="text-sm text-destructive">{errors.general}</div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="network">Network</Label>
                        <Select
                            value={formData.network}
                            onValueChange={(value) => {
                                setFormData({ ...formData, network: value });
                                setErrors({ ...errors, network: undefined });
                            }}
                            required
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mtn">MTN</SelectItem>
                                <SelectItem value="telecel">Telecel</SelectItem>
                                <SelectItem value="airteltigo">AirtelTigo</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.network} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Package Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({ ...formData, name: e.target.value });
                                setErrors({ ...errors, name: undefined });
                            }}
                            placeholder="e.g., 1GB Weekly"
                            required
                            disabled={loading}
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="data_size">Data Size</Label>
                        <Input
                            id="data_size"
                            value={formData.data_size}
                            onChange={(e) => {
                                setFormData({ ...formData, data_size: e.target.value });
                                setErrors({ ...errors, data_size: undefined });
                            }}
                            placeholder="e.g., 1GB"
                            required
                            disabled={loading}
                        />
                        <InputError message={errors.data_size} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (GHS)</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={(e) => {
                                    setFormData({ ...formData, price: e.target.value });
                                    setErrors({ ...errors, price: undefined });
                                }}
                                required
                                disabled={loading}
                            />
                            <InputError message={errors.price} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vendor_price">Vendor Price (GHS)</Label>
                            <Input
                                id="vendor_price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.vendor_price}
                                onChange={(e) => {
                                    setFormData({ ...formData, vendor_price: e.target.value });
                                    setErrors({ ...errors, vendor_price: undefined });
                                }}
                                required
                                disabled={loading}
                            />
                            <InputError message={errors.vendor_price} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="validity">Validity</Label>
                        <Input
                            id="validity"
                            value={formData.validity}
                            onChange={(e) => {
                                setFormData({ ...formData, validity: e.target.value });
                                setErrors({ ...errors, validity: undefined });
                            }}
                            placeholder="e.g., 30 days"
                            required
                            disabled={loading}
                        />
                        <InputError message={errors.validity} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Spinner />}
                            {loading ? 'Creating...' : 'Create Package'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

