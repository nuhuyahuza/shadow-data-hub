<?php

namespace App\Http\Controllers;

use App\Http\Requests\DataPurchaseRequest;
use App\Models\DataPackage;
use App\Models\Transaction;
use App\Services\VendorService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DataPurchaseController extends Controller
{
    public function __construct(
        protected WalletService $walletService,
        protected VendorService $vendorService
    ) {}

    /**
     * Purchase data bundle.
     */
    public function store(DataPurchaseRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // Check wallet balance first (before transaction to avoid unnecessary locks)
        $wallet = $this->walletService->getWallet($user);
        $package = DataPackage::findOrFail($validated['package_id']);

        if ($wallet['balance'] < $package->price) {
            return response()->json([
                'message' => 'Insufficient wallet balance',
                'requires_funding' => true,
                'current_balance' => $wallet['balance'],
                'required_amount' => $package->price,
                'shortfall' => $package->price - $wallet['balance'],
            ], 422);
        }

        // Extract idempotency key before transaction closure
        $idempotencyKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');

        return DB::transaction(function () use ($validated, $user, $package, $idempotencyKey) {
            // Reload package with lock to ensure consistency
            $package = DataPackage::lockForUpdate()->findOrFail($validated['package_id']);

            if (! $package->is_active) {
                return response()->json([
                    'message' => 'This package is not available',
                ], 422);
            }

            // Verify network matches
            if ($package->network !== $validated['network']) {
                return response()->json([
                    'message' => 'Network mismatch',
                ], 422);
            }

            // Generate transaction reference with idempotency key
            $reference = $idempotencyKey ? 'TXN-'.$idempotencyKey : 'TXN'.strtoupper(uniqid());

            // Check for existing transaction with same reference (idempotency)
            $existingTransaction = Transaction::where('reference', $reference)
                ->where('user_id', $user->id)
                ->where('type', 'purchase')
                ->first();

            if ($existingTransaction) {
                // Transaction already exists, return existing result
                if ($existingTransaction->status === 'success') {
                    return response()->json([
                        'message' => 'Data bundle purchased successfully',
                        'transaction_reference' => $reference,
                        'vendor_reference' => $existingTransaction->vendor_reference ?? null,
                        'idempotent' => true,
                    ]);
                }

                // If transaction exists but failed, allow retry with new reference
                if ($existingTransaction->status === 'failed') {
                    $reference = 'TXN'.strtoupper(uniqid());
                } else {
                    // Transaction is pending, return pending status
                    return response()->json([
                        'message' => 'Transaction is already being processed',
                        'transaction_reference' => $reference,
                        'status' => 'pending',
                        'idempotent' => true,
                    ], 202);
                }
            }

            // Deduct from wallet (atomic operation with lock)
            $deducted = $this->walletService->deduct(
                $user,
                $package->price,
                $reference,
                [
                    'network' => $package->network,
                    'package_id' => $package->id,
                    'phone_number' => $validated['phone_number'],
                ]
            );

            if (! $deducted) {
                return response()->json([
                    'message' => 'Insufficient wallet balance',
                    'requires_funding' => true,
                ], 422);
            }

            // Get the transaction
            $transaction = Transaction::where('reference', $reference)->firstOrFail();

            // Call vendor API
            $vendorResult = $this->vendorService->purchaseData($transaction);

            // Check if manual processing is required
            if (isset($vendorResult['requires_manual_processing']) && $vendorResult['requires_manual_processing']) {
                // Transaction is pending manual processing - don't refund, just return pending status
                // User-friendly message without mentioning manual processing
                return response()->json([
                    'message' => 'Data bundle purchase successful! You will receive your data shortly.',
                    'transaction_reference' => $reference,
                    'status' => 'pending',
                    'requires_manual_processing' => true,
                ], 200);
            }

            if (! $vendorResult['success']) {
                // Auto-refund on vendor failure (only if not manual processing)
                $this->walletService->refund($user, $package->price, $reference);

                // Update transaction status to failed
                $transaction->update(['status' => 'failed']);

                return response()->json([
                    'message' => $vendorResult['message'] ?? 'Failed to purchase data bundle',
                    'transaction_reference' => $reference,
                ], 422);
            }

            // Transaction is already updated to success by vendor service in test mode
            // Just ensure it's synced
            $transaction->refresh();

            return response()->json([
                'message' => 'Data bundle purchased successfully',
                'transaction_reference' => $reference,
                'vendor_reference' => $vendorResult['vendor_reference'] ?? null,
                'status' => 'success',
            ]);
        });
    }
}
