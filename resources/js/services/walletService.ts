const API_BASE = '/api';

export interface FundWalletRequest {
    amount: number;
    payment_method: 'mtn_momo' | 'telecel_cash' | 'airteltigo_money';
}

export interface FundWalletResponse {
    success: boolean;
    reference: string;
    transaction_id: number;
    payment_url?: string | null;
    public_key?: string | null;
    payment_method?: string;
    display?: {
        type?: string;
        message?: string;
        message_dial?: string;
        message_prompt?: string;
        timer?: number;
    } | null;
    message?: string;
}

export interface TransactionStatusResponse {
    success: boolean;
    status: 'success' | 'pending' | 'failed' | 'not_found';
    reference: string;
    message: string;
    wallet?: {
        balance: number | string;
        total_funded: number | string;
        total_spent: number | string;
    };
}

/**
 * Fund wallet with Paystack payment.
 */
export async function fundWallet(
    data: FundWalletRequest
): Promise<FundWalletResponse> {
    const response = await fetch(`${API_BASE}/wallet/fund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN':
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                    ?.content || '',
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fund wallet');
    }

    return response.json();
}

/**
 * Check transaction status for wallet funding.
 */
export async function checkTransactionStatus(
    reference: string
): Promise<TransactionStatusResponse> {
    const response = await fetch(`${API_BASE}/wallet/status/${reference}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN':
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                    ?.content || '',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to check transaction status');
    }

    return response.json();
}

/**
 * Get wallet balance and stats.
 */
export async function getWallet(): Promise<{
    balance: number | string;
    total_funded: number | string;
    total_spent: number | string;
}> {
    const response = await fetch(`${API_BASE}/wallet`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN':
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                    ?.content || '',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get wallet');
    }

    return response.json();
}

