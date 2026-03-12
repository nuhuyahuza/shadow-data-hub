<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Transaction;

class OrderService
{
    /**
     * Create an order from a successful purchase transaction (idempotent).
     * Call only when payment is confirmed (webhook charge.success or after wallet deduct + vendor success).
     */
    public function createFromTransaction(Transaction $transaction): ?Order
    {
        if ($transaction->type !== 'purchase' || $transaction->status !== 'success') {
            return null;
        }

        if (! $transaction->package_id || ! $transaction->user_id) {
            return null;
        }

        $existing = Order::where('transaction_id', $transaction->id)->first();
        if ($existing) {
            return $existing;
        }

        $meta = $transaction->meta ?? [];
        $storeId = $meta['store_id'] ?? null;
        $paymentChannel = $meta['payment_channel'] ?? 'wallet';

        $package = $transaction->package;
        $network = $package ? $package->network : $transaction->network;

        return Order::create([
            'user_id' => $transaction->user_id,
            'transaction_id' => $transaction->id,
            'store_id' => $storeId,
            'data_package_id' => $transaction->package_id,
            'network' => $network ?? 'mtn',
            'phone_number' => $transaction->phone_number ?? '',
            'amount' => $transaction->amount,
            'status' => 'fulfilled',
            'vendor_reference' => $transaction->vendor_reference,
            'payment_channel' => $paymentChannel,
        ]);
    }
}
