import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: 'user' | 'agent' | 'admin';
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    wallet?: {
        balance: number;
        total_funded: number;
        total_spent: number;
    };
    [key: string]: unknown; // This allows for additional properties...
}

export type TransactionStatus = 'pending' | 'refunded' | 'failed' | 'success';

export interface Transaction {
    id: number;
    reference: string;
    type: string;
    status: TransactionStatus;
    amount: number | string;
    network?: string;
    phone_number?: string;
    user?: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    package?: {
        id: number;
        name: string;
        network: string;
        data_size: string;
        price: number | string;
    };
    vendor_reference?: string;
    vendor_response?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}
