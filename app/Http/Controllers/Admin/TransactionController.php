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

        if ($transaction->status !== 'failed') {
            return response()->json([
                'message' => 'Can only refund failed transactions',
            ], 422);
        }

        $this->walletService->refund(
            $transaction->user,
            $transaction->amount,
            $transaction->reference
        );

        return response()->json([
            'message' => 'Refund processed successfully',
        ]);
    }
}
