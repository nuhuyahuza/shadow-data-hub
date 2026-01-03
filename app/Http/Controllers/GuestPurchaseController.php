<?php

namespace App\Http\Controllers;

use App\Http\Requests\DataPurchaseRequest;
use App\Models\DataPackage;
use App\Models\Transaction;
use App\Services\DirectPaymentService;
use App\Services\GuestAccountService;
use App\Services\VendorService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GuestPurchaseController extends Controller
{
    public function __construct(
        protected GuestAccountService $guestAccountService,
        protected DirectPaymentService $directPaymentService,
        protected WalletService $walletService,
        protected VendorService $vendorService
    ) {}

    /**
     * Handle guest purchase (no authentication required).
     */
    public function store(DataPurchaseRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $paymentMethod = $validated['payment_method'] ?? 'direct';
        $paymentPhone = $validated['payment_phone'] ?? $validated['phone_number'];

        return DB::transaction(function () use ($validated, $paymentMethod, $paymentPhone) {
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

            // Auto-create or get guest account based on payment phone
            $user = $this->guestAccountService->createOrGetGuestAccount($paymentPhone);

            // Generate transaction reference
            $reference = 'TXN'.strtoupper(uniqid());

            // Handle different payment methods
            if ($paymentMethod === 'direct' || in_array($paymentMethod, ['mtn_momo', 'telecel_cash', 'airteltigo_money'])) {
                // Direct payment flow
                return $this->handleDirectPayment($user, $package, $validated, $paymentPhone, $paymentMethod, $reference);
            } else {
                // Wallet funding flow
                return $this->handleWalletPayment($user, $package, $validated, $reference);
            }
        });
    }

    /**
     * Handle direct payment flow.
     */
    private function handleDirectPayment(
        $user,
        DataPackage $package,
        array $validated,
        string $paymentPhone,
        string $paymentMethod,
        string $reference
    ): JsonResponse {
        // Initiate direct payment
        $paymentResult = $this->directPaymentService->initiatePayment([
            'user_id' => $user->id,
            'reference' => $reference,
            'amount' => $package->price,
            'payment_phone' => $paymentPhone,
            'payment_method' => $paymentMethod,
            'network' => $package->network,
            'package_id' => $package->id,
            'phone_number' => $validated['phone_number'],
        ]);

        // Create transaction record
        $transaction = Transaction::where('reference', $reference)->firstOrFail();
        $transaction->update([
            'guest_phone' => $paymentPhone,
        ]);

        if (! $paymentResult['success']) {
            return response()->json([
                'message' => $paymentResult['message'] ?? 'Failed to initiate payment',
                'transaction_reference' => $reference,
            ], 422);
        }

        return response()->json([
            'message' => 'Payment initiated. Please complete payment to receive your data bundle.',
            'transaction_reference' => $reference,
            'payment_url' => $paymentResult['payment_url'],
            'public_key' => $paymentResult['public_key'] ?? null, // Include Paystack public key
            'requires_payment' => true,
        ]);
    }

    /**
     * Handle wallet payment flow.
     */
    private function handleWalletPayment(
        $user,
        DataPackage $package,
        array $validated,
        string $reference
    ): JsonResponse {
        // Check wallet balance
        $wallet = $user->wallet;
        if (! $wallet || $wallet->balance < $package->price) {
            return response()->json([
                'message' => 'Insufficient wallet balance. Please fund your wallet first.',
                'requires_funding' => true,
                'current_balance' => $wallet->balance ?? 0,
                'required_amount' => $package->price,
            ], 422);
        }

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

        // Call vendor API to deliver data bundle
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
    }

    /**
     * Handle payment webhook callback.
     */
    public function webhook(Request $request): JsonResponse
    {
        try {
            $result = $this->directPaymentService->handleWebhook($request);

            if (! $result['success']) {
                return response()->json([
                    'message' => $result['message'],
                ], 400);
            }

            $transaction = $result['transaction'];

            // If payment successful and transaction is a purchase, deliver data bundle
            if ($transaction->status === 'success' && $transaction->type === 'purchase') {
                $vendorResult = $this->vendorService->purchaseData($transaction);

                if (! $vendorResult['success']) {
                    Log::error('Failed to deliver data bundle after payment', [
                        'transaction_id' => $transaction->id,
                        'reference' => $transaction->reference,
                        'vendor_error' => $vendorResult['message'] ?? 'Unknown error',
                    ]);

                    // Note: We don't refund here as payment was successful
                    // Admin should handle this manually
                    return response()->json([
                        'message' => 'Payment successful but data delivery failed. Please contact support.',
                        'transaction_reference' => $transaction->reference,
                    ], 500);
                }

                return response()->json([
                    'message' => 'Payment confirmed and data bundle delivered',
                    'transaction_reference' => $transaction->reference,
                    'vendor_reference' => $vendorResult['vendor_reference'] ?? null,
                ]);
            }

            return response()->json([
                'message' => 'Webhook processed successfully',
                'transaction_reference' => $transaction->reference,
            ]);
        } catch (\Exception $e) {
            Log::error('Webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error processing webhook',
            ], 500);
        }
    }

    /**
     * Check payment status by transaction reference.
     */
    public function checkStatus(string $reference): JsonResponse
    {
        $transaction = Transaction::where('reference', $reference)->first();

        if (! $transaction) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'Transaction not found',
            ], 404);
        }

        return response()->json([
            'status' => $transaction->status,
            'reference' => $transaction->reference,
            'message' => $transaction->status === 'success'
                ? 'Payment successful'
                : ($transaction->status === 'failed' ? 'Payment failed' : 'Payment pending'),
        ]);
    }
}
