<?php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    /**
     * List all transactions (read-only for agents).
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
     * Fulfill a pending transaction (mark as completed).
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
