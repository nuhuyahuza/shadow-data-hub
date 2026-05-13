const API_BASE = '/api';

import { apiFetch } from './api';

export interface GuestPurchaseRequest {
    package_id: string;
    network: string;
    phone_number: string;
    payment_method?: 'direct' | 'wallet' | 'mtn_momo' | 'telecel_cash' | 'airteltigo_money';
    payment_phone?: string;
    store_id?: string | null;
}

export interface GuestPurchaseResponse {
    message: string;
    transaction_reference: string;
    payment_url?: string | null;
    public_key?: string; // Paystack public key
    payment_method?: 'mobile_money' | 'card' | 'direct';
    paystack_transaction_id?: string | null;
    display?: {
        type?: string;
        message?: string;
        message_dial?: string;
        message_prompt?: string;
        timer?: number;
    };
    requires_payment?: boolean;
    requires_funding?: boolean;
    current_balance?: number;
    required_amount?: number;
    vendor_reference?: string | null;
}

export interface PaymentResponse {
    success: boolean;
    message: string;
    transaction_reference?: string;
    payment_url?: string;
}

/**
 * Initiate direct payment for guest purchase.
 */
export async function initiateDirectPayment(
    data: GuestPurchaseRequest
): Promise<GuestPurchaseResponse> {
    const response = await apiFetch(`${API_BASE}/guest/purchase`, {
        method: 'POST',
        body: JSON.stringify({
            ...data,
            payment_method: data.payment_method || 'direct',
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate payment');
    }

    return response.json();
}

/**
 * Fund wallet and purchase data bundle.
 */
export async function fundWalletAndPurchase(
    data: GuestPurchaseRequest & { amount: number }
): Promise<GuestPurchaseResponse> {
    // First, fund the wallet
    const fundResponse = await apiFetch(`${API_BASE}/wallet/fund`, {
        method: 'POST',
        body: JSON.stringify({
            amount: data.amount,
            payment_method: data.payment_method || 'mtn_momo',
        }),
    });

    if (!fundResponse.ok) {
        const error = await fundResponse.json();
        throw new Error(error.message || 'Failed to fund wallet');
    }

    const fundData = await fundResponse.json();

    // Wait a moment for webhook to process (in production, use webhook callback)
    // For now, we'll proceed with purchase assuming funding succeeded
    // In production, you'd wait for webhook confirmation

    // Then purchase with wallet
    const purchaseResponse = await apiFetch(`${API_BASE}/guest/purchase`, {
        method: 'POST',
        body: JSON.stringify({
            package_id: data.package_id,
            network: data.network,
            phone_number: data.phone_number,
            payment_method: 'wallet',
        }),
    });

    if (!purchaseResponse.ok) {
        const error = await purchaseResponse.json();
        throw new Error(error.message || 'Failed to purchase data bundle');
    }

    return purchaseResponse.json();
}

/**
 * Purchase data bundle using wallet balance (for authenticated users).
 */
export interface WalletPurchaseRequest {
    package_id: string;
    network: string;
    phone_number: string;
    idempotency_key?: string;
}

export interface WalletPurchaseResponse {
    message: string;
    transaction_reference: string;
    vendor_reference?: string | null;
    idempotent?: boolean;
    status?: 'success' | 'pending';
    requires_funding?: boolean;
    current_balance?: number;
    required_amount?: number;
    shortfall?: number;
}

export async function purchaseWithWallet(
    data: WalletPurchaseRequest
): Promise<WalletPurchaseResponse> {
    const response = await apiFetch(`${API_BASE}/data/purchase`, {
        method: 'POST',
        headers: {
            ...(data.idempotency_key && { 'Idempotency-Key': data.idempotency_key }),
        },
        body: JSON.stringify(data),
    });

    // 202 Accepted is a valid response for pending/idempotent transactions
    if (!response.ok && response.status !== 202) {
        const error = await response.json();
        throw error;
    }

    return response.json();
}

/**
 * Redirect to payment gateway URL.
 */
export function redirectToPayment(paymentUrl: string): void {
    if (paymentUrl) {
        window.location.href = paymentUrl;
    }
}

