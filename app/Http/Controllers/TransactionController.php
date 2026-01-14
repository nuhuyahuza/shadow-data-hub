<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    /**
     * List user transactions with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Transaction::where('user_id', $user->id)
            ->with('package')
            ->latest();

        // Filter by status
        if ($request->has('status') && in_array($request->input('status'), ['pending', 'success', 'failed'])) {
            $query->where('status', $request->input('status'));
        }

        // Filter by type
        if ($request->has('type') && in_array($request->input('type'), ['purchase', 'funding'])) {
            $query->where('type', $request->input('type'));
        }

        // Filter by network
        if ($request->has('network') && in_array($request->input('network'), ['mtn', 'telecel', 'airteltigo'])) {
            $query->where('network', $request->input('network'));
        }

        $transactions = $query->paginate($request->input('per_page', 15));

        return response()->json($transactions);
    }

    /**
     * Get transaction details.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $transaction = Transaction::where('user_id', $user->id)
            ->with('package')
            ->findOrFail($id);

        return response()->json($transaction);
    }

    /**
     * Mark transaction as complete (only for agents/admins).
     */
    public function markComplete(Request $request, string $reference): JsonResponse
    {
        $user = $request->user();

        // Only allow agents or admins to complete transactions manually
        if (! $user->isAgent() && ! $user->isAdmin()) {
            return response()->json([
                'message' => 'Only agents or admins can complete transactions manually',
            ], 403);
        }

        $transaction = Transaction::where('reference', $reference)
            ->where('type', 'purchase')
            ->where('status', 'pending')
            ->firstOrFail();

        // Update transaction to success with test vendor reference
        $transaction->update([
            'status' => 'success',
            'vendor_reference' => 'MANUAL-'.strtoupper(substr($transaction->reference, -8)),
            'vendor_response' => array_merge(
                $transaction->vendor_response ?? [],
                [
                    'manual_completion' => true,
                    'completed_at' => now()->toIso8601String(),
                    'completed_by' => $user->id,
                    'completed_by_role' => $user->role,
                ]
            ),
        ]);

        return response()->json([
            'message' => 'Transaction marked as complete',
            'transaction_reference' => $transaction->reference,
            'status' => 'success',
        ]);
    }
}
