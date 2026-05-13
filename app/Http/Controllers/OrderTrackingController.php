<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderTrackingController extends Controller
{
    /**
     * Show track order page (no auth). Query params: reference (required), phone (optional).
     * When request has a resolved store (subdomain), only show orders for that store.
     */
    public function show(Request $request): Response
    {
        $reference = $request->query('reference');
        $phone = $request->query('phone');

        if (! $reference || ! is_string($reference)) {
            return Inertia::render('track-order', [
                'order' => null,
                'error' => null,
                'searched' => false,
            ]);
        }

        $transaction = Transaction::where('reference', $reference)
            ->where('type', 'purchase')
            ->first();

        if (! $transaction) {
            return Inertia::render('track-order', [
                'order' => null,
                'error' => 'Order not found.',
                'searched' => true,
            ]);
        }

        $order = Order::where('transaction_id', $transaction->id)->first();

        if (! $order) {
            return Inertia::render('track-order', [
                'order' => null,
                'error' => 'Order not found.',
                'searched' => true,
            ]);
        }

        // When on subdomain (store resolved), only allow tracking orders for that store
        $store = $request->attributes->get('store');
        if ($store && (string) $order->store_id !== (string) $store->id) {
            return Inertia::render('track-order', [
                'order' => null,
                'error' => 'Order not found.',
                'searched' => true,
            ]);
        }

        // Optional phone verification: if provided, must match
        if ($phone !== null && $phone !== '' && $order->phone_number !== $phone) {
            return Inertia::render('track-order', [
                'order' => null,
                'error' => 'Order not found.',
                'searched' => true,
            ]);
        }

        $order->load(['dataPackage', 'store']);

        return Inertia::render('track-order', [
            'order' => [
                'reference' => $transaction->reference,
                'status' => $order->status,
                'amount' => $order->amount,
                'network' => $order->network,
                'phone_number' => $order->phone_number,
                'created_at' => $order->created_at->toIso8601String(),
                'package_name' => $order->dataPackage?->name,
                'package_data_size' => $order->dataPackage?->data_size,
                'store_name' => $order->store?->name,
            ],
            'error' => null,
            'searched' => true,
        ]);
    }
}
