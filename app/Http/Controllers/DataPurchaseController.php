<?php

namespace App\Http\Controllers;

use App\Http\Requests\DataPurchaseRequest;
use App\Models\DataPackage;
use App\Models\Store;
use App\Models\StorePackagePricing;
use App\Models\Transaction;
use App\Services\DirectPaymentService;
use App\Services\OrderService;
use App\Services\VendorService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DataPurchaseController extends Controller
{
    public function __construct(
        protected WalletService $walletService,
        protected VendorService $vendorService,
        protected OrderService $orderService,
        protected DirectPaymentService $directPaymentService
    ) {}

    /**
     * Purchase data bundle (wallet or Paystack). Price resolved from DB (store or system).
     */
    public function store(DataPurchaseRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $package = DataPackage::findOrFail($validated['package_id']);

        if (! $package->is_active) {
            return response()->json(['message' => 'This package is not available'], 422);
        }

        if ($package->network !== $validated['network']) {
            return response()->json(['message' => 'Network mismatch'], 422);
        }

        $resolvedPrice = $this->resolvePrice($user, $package, $validated['store_id'] ?? null);
        if ($resolvedPrice < 0) {
            return response()->json(['message' => 'Store not found or not visible.'], 422);
        }

        $paymentMethod = $validated['payment_method'] ?? 'wallet';
        $isPaystack = in_array($paymentMethod, ['direct', 'mtn_momo', 'telecel_cash', 'airteltigo_money'], true);

        if ($isPaystack) {
            return $this->purchaseViaPaystack($user, $package, $resolvedPrice, $validated);
        }

        return $this->purchaseViaWallet($user, $package, $resolvedPrice, $validated, $request);
    }

    /**
     * Resolve selling price from store or system (never trust frontend amount).
     */
    protected function resolvePrice($user, DataPackage $package, ?string $storeId): float
    {
        if ($storeId) {
            $store = Store::where('id', $storeId)->where('user_id', $user->id)->where('is_visible', true)->first();
            if (! $store) {
                return -1; // Caller should check and return 422
            }
            $pricing = StorePackagePricing::where('store_id', $store->id)->where('data_package_id', $package->id)->first();

            return $pricing ? (float) $pricing->price : (float) $package->price;
        }

        return (float) $package->price;
    }

    /**
     * Initiate Paystack payment; order created in webhook on charge.success.
     */
    protected function purchaseViaPaystack($user, DataPackage $package, float $amount, array $validated): JsonResponse
    {
        $reference = 'TXN'.strtoupper(uniqid());
        $paymentPhone = $validated['payment_phone'] ?? $validated['phone_number'];
        $paymentMethod = $validated['payment_method'] ?? 'mtn_momo';

        $data = [
            'user_id' => $user->id,
            'reference' => $reference,
            'amount' => $amount,
            'payment_phone' => $paymentPhone,
            'payment_method' => $paymentMethod,
            'network' => $package->network,
            'package_id' => $package->id,
            'phone_number' => $validated['phone_number'],
        ];
        if (! empty($validated['store_id'])) {
            $data['store_id'] = $validated['store_id'];
        }

        $result = $this->directPaymentService->initiatePayment($data);

        if (! $result['success']) {
            return response()->json([
                'message' => $result['message'] ?? 'Failed to initiate payment',
                'transaction_reference' => $reference,
            ], 422);
        }

        return response()->json([
            'message' => 'Payment initiated. Complete payment to receive your data bundle.',
            'transaction_reference' => $reference,
            'payment_url' => $result['payment_url'] ?? null,
            'public_key' => $result['public_key'] ?? null,
            'requires_payment' => true,
        ]);
    }

    /**
     * Purchase using wallet balance; order created after successful delivery.
     */
    protected function purchaseViaWallet($user, DataPackage $package, float $resolvedPrice, array $validated, DataPurchaseRequest $request): JsonResponse
    {
        $wallet = $this->walletService->getWallet($user);

        if ($wallet['balance'] < $resolvedPrice) {
            return response()->json([
                'message' => 'Insufficient wallet balance',
                'requires_funding' => true,
                'current_balance' => $wallet['balance'],
                'required_amount' => $resolvedPrice,
                'shortfall' => $resolvedPrice - $wallet['balance'],
            ], 422);
        }

        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');

        return DB::transaction(function () use ($validated, $user, $package, $resolvedPrice, $idempotencyKey) {
            $package = DataPackage::lockForUpdate()->where('id', $validated['package_id'])->where('is_active', true)->firstOrFail();

            if ($package->network !== $validated['network']) {
                return response()->json(['message' => 'Network mismatch'], 422);
            }

            $reference = $idempotencyKey ? 'TXN-'.$idempotencyKey : 'TXN'.strtoupper(uniqid());

            $existingTransaction = Transaction::where('reference', $reference)
                ->where('user_id', $user->id)
                ->where('type', 'purchase')
                ->first();

            if ($existingTransaction) {
                if ($existingTransaction->status === 'success') {
                    return response()->json([
                        'message' => 'Data bundle purchased successfully',
                        'transaction_reference' => $reference,
                        'vendor_reference' => $existingTransaction->vendor_reference ?? null,
                        'idempotent' => true,
                    ]);
                }
                if ($existingTransaction->status === 'failed') {
                    $reference = 'TXN'.strtoupper(uniqid());
                } else {
                    return response()->json([
                        'message' => 'Transaction is already being processed',
                        'transaction_reference' => $reference,
                        'status' => 'pending',
                        'idempotent' => true,
                    ], 202);
                }
            }

            $meta = [
                'source' => 'purchase',
                'payment_channel' => 'wallet',
            ];
            if (! empty($validated['store_id'])) {
                $meta['store_id'] = $validated['store_id'];
            }

            $deducted = $this->walletService->deduct(
                $user,
                $resolvedPrice,
                $reference,
                [
                    'network' => $package->network,
                    'package_id' => $package->id,
                    'phone_number' => $validated['phone_number'],
                    'meta' => $meta,
                ]
            );

            if (! $deducted) {
                return response()->json([
                    'message' => 'Insufficient wallet balance',
                    'requires_funding' => true,
                ], 422);
            }

            $transaction = Transaction::where('reference', $reference)->firstOrFail();
            $vendorResult = $this->vendorService->purchaseData($transaction);

            if (isset($vendorResult['requires_manual_processing']) && $vendorResult['requires_manual_processing']) {
                return response()->json([
                    'message' => 'Data bundle purchase successful! You will receive your data shortly.',
                    'transaction_reference' => $reference,
                    'status' => 'pending',
                    'requires_manual_processing' => true,
                ], 200);
            }

            if (! $vendorResult['success']) {
                $this->walletService->refund($user, $resolvedPrice, $reference);
                $transaction->update(['status' => 'failed']);

                return response()->json([
                    'message' => $vendorResult['message'] ?? 'Failed to purchase data bundle',
                    'transaction_reference' => $reference,
                ], 422);
            }

            $transaction->refresh();
            $this->orderService->createFromTransaction($transaction);

            return response()->json([
                'message' => 'Data bundle purchased successfully',
                'transaction_reference' => $reference,
                'vendor_reference' => $vendorResult['vendor_reference'] ?? null,
                'status' => 'success',
            ]);
        });
    }
}
