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

        // Update transaction status to success
        $transaction->status = 'success';
        $transaction->save();

        // TODO: Trigger actual data bundle delivery via vendor service
        // This would typically call the vendor API to deliver the data

        return response()->json([
            'message' => 'Transaction fulfilled successfully',
            'transaction' => $transaction->fresh(['user', 'package']),
        ]);
    }
}
