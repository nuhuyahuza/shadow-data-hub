const API_BASE = '/api';

export interface SendOtpResponse {
    message: string;
    expires_at: string;
    network?: string;
}

export interface VerifyOtpResponse {
    message: string;
    user: {
        id: number;
        name: string;
        phone: string;
        role: string;
        wallet?: {
            balance: number;
            total_funded: number;
            total_spent: number;
        };
    };
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
}

/**
 * Format phone number for display (+233 XX XXX XXXX).
 */
export function formatPhoneForDisplay(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Remove leading 0 if present
    let formatted = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
    
    // Add country code if not present
    if (!formatted.startsWith('233')) {
        formatted = '233' + formatted;
    }
    
    // Remove country code for formatting
    const number = formatted.slice(3);
    
    if (number.length === 9) {
        return `+233 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
    }
    
    return `+233 ${number}`;
}

/**
 * Detect network from phone number.
 */
export function detectNetwork(phone: string): string | null {
    // Remove country code if present
    let cleaned = phone.replace(/\D/g, '');
    cleaned = cleaned.startsWith('233') ? cleaned.slice(3) : cleaned;
    cleaned = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
    
    // MTN prefixes: 24, 54, 55, 59
    if (/^(24|54|55|59)/.test(cleaned)) {
        return 'mtn';
    }
    
    // Telecel (Vodafone) prefixes: 20, 50
    if (/^(20|50)/.test(cleaned)) {
        return 'telecel';
    }
    
    // AirtelTigo prefixes: 26, 56, 57
    if (/^(26|56|57)/.test(cleaned)) {
        return 'airteltigo';
    }
    
    return null;
}

/**
 * Get network display name.
 */
export function getNetworkName(network: string | null): string {
    const names: Record<string, string> = {
        mtn: 'MTN',
        telecel: 'Telecel',
        airteltigo: 'AirtelTigo',
    };
    
    return network ? names[network] || network : 'Unknown';
}

/**
 * Get network brand color.
 */
export function getNetworkColor(network: string | null): string {
    const colors: Record<string, string> = {
        mtn: 'bg-yellow-500',
        telecel: 'bg-red-500',
        airteltigo: 'bg-blue-500',
    };
    
    return network ? colors[network] || 'bg-gray-500' : 'bg-gray-500';
}

/**
 * Send OTP to phone number.
 */
export async function sendOtp(phone: string): Promise<SendOtpResponse> {
    const response = await fetch(`${API_BASE}/auth/otp/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ phone }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send OTP');
    }

    return response.json();
}

/**
 * Verify OTP code.
 */
export async function verifyOtp(
    phone: string,
    code: string
): Promise<VerifyOtpResponse> {
    const response = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ phone, code }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify OTP');
    }

    return response.json();
}

