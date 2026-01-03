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
}
