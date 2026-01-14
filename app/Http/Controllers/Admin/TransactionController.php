<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {}

    /**
     * List all transactions.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transaction::with(['user', 'package'])->latest();

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->has('network')) {
            $query->where('network', $request->input('network'));
        }

        $transactions = $query->paginate($request->input('per_page', 15));

        return response()->json($transactions);
    }

    /**
     * Manual refund for a transaction.
     */
    public function refund(Request $request, string $id): JsonResponse
    {
        $transaction = Transaction::with('user')->findOrFail($id);

        // Only allow refunding failed or pending transactions that were paid via wallet
        if (! in_array($transaction->status, ['failed', 'pending'])) {
            return response()->json([
                'message' => 'Can only refund failed or pending transactions',
            ], 422);
        }

        // Check if transaction was paid via wallet (has wallet deduction)
        if ($transaction->type !== 'purchase') {
            return response()->json([
                'message' => 'Can only refund purchase transactions',
            ], 422);
        }

        // Check if transaction has a user (must be authenticated user, not guest)
        if (! $transaction->user_id || ! $transaction->user) {
            return response()->json([
                'message' => 'Cannot refund guest transactions. Only authenticated user transactions can be refunded.',
            ], 422);
        }

        try {
            $this->walletService->refund(
                $transaction->user,
                $transaction->amount,
                $transaction->reference,
                $transaction
            );

            return response()->json([
                'message' => 'Refund processed successfully',
                'transaction' => $transaction->fresh(['user', 'package']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get transaction details.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $transaction = Transaction::with(['user', 'package'])->findOrFail($id);

        return response()->json($transaction);
    }

    /**
     * Update transaction status.
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:pending,success,failed,cancelled,refunded'],
        ]);

        $transaction = Transaction::with(['user', 'package'])->findOrFail($id);

        // If marking as failed and it was a wallet purchase, offer to refund
        // But don't auto-refund - let admin decide
        if ($validated['status'] === 'failed' && $transaction->type === 'purchase' && $transaction->status !== 'failed') {
            // Just update status - refund must be done separately
        }

        $transaction->update([
            'status' => $validated['status'],
            'vendor_response' => array_merge(
                $transaction->vendor_response ?? [],
                [
                    'status_updated_manually' => true,
                    'updated_by' => $request->user()->id,
                    'updated_at' => now()->toIso8601String(),
                ]
            ),
        ]);

        return response()->json([
            'message' => 'Transaction status updated successfully',
            'transaction' => $transaction->fresh(['user', 'package']),
        ]);
    }

    /**
     * Manually fulfill a pending transaction (when vendor API is not available).
     */
    public function fulfill(Request $request, string $id): JsonResponse
    {
        $transaction = Transaction::with(['user', 'package'])->findOrFail($id);

        if ($transaction->status !== 'pending') {
            return response()->json([
                'message' => 'Can only fulfill pending transactions',
            ], 422);
        }

        if ($transaction->type !== 'purchase') {
            return response()->json([
                'message' => 'Can only fulfill purchase transactions',
            ], 422);
        }

        // Update transaction status to success
        $transaction->update([
            'status' => 'success',
            'vendor_reference' => 'MANUAL-'.strtoupper(substr($transaction->reference, -8)),
            'vendor_response' => array_merge(
                $transaction->vendor_response ?? [],
                [
                    'fulfilled_manually' => true,
                    'fulfilled_by' => $request->user()->id,
                    'fulfilled_at' => now()->toIso8601String(),
                ]
            ),
        ]);

        return response()->json([
            'message' => 'Transaction fulfilled successfully',
            'transaction' => $transaction->fresh(['user', 'package']),
        ]);
    }
}
