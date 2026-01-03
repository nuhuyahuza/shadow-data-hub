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

        return DB::transaction(function () use ($validated, $user) {
            // Get package
            $package = DataPackage::findOrFail($validated['package_id']);

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

            // Generate transaction reference
            $reference = 'TXN'.strtoupper(uniqid());

            // Deduct from wallet
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
                ], 422);
            }

            // Get the transaction
            $transaction = Transaction::where('reference', $reference)->firstOrFail();

            // Call vendor API
            $vendorResult = $this->vendorService->purchaseData($transaction);

            if (! $vendorResult['success']) {
                // Auto-refund on vendor failure
                $this->walletService->refund($user, $package->price, $reference);

                return response()->json([
                    'message' => $vendorResult['message'] ?? 'Failed to purchase data bundle',
                    'transaction_reference' => $reference,
                ], 422);
            }

            return response()->json([
                'message' => 'Data bundle purchased successfully',
                'transaction_reference' => $reference,
                'vendor_reference' => $vendorResult['vendor_reference'] ?? null,
            ]);
        });
    }
}
