<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {}

    /**
     * Show the dashboard.
     */
    public function index(Request $request): RedirectResponse|Response
    {
        $user = $request->user();

        // Redirect based on user role
        if ($user->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        if ($user->role === 'agent') {
            return redirect()->route('agent.transactions');
        }

        // Regular user dashboard
        // Get wallet balance
        $wallet = $this->walletService->getWallet($user);

        // Get total data purchased (sum of successful purchase transactions)
        $totalDataPurchased = Transaction::where('user_id', $user->id)
            ->where('type', 'purchase')
            ->where('status', 'success')
            ->sum('amount');

        // Get total transactions count
        $totalTransactions = Transaction::where('user_id', $user->id)->count();

        // Get recent transactions (last 5)
        $recentTransactions = Transaction::where('user_id', $user->id)
            ->with('package')
            ->latest()
            ->limit(5)
            ->get()
            ->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'reference' => $transaction->reference,
                    'type' => $transaction->type,
                    'network' => $transaction->network,
                    'package_name' => $transaction->package?->name,
                    'phone_number' => $transaction->phone_number,
                    'amount' => $transaction->amount,
                    'status' => $transaction->status,
                    'created_at' => $transaction->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('dashboard', [
            'wallet' => $wallet,
            'totalDataPurchased' => $totalDataPurchased,
            'totalTransactions' => $totalTransactions,
            'recentTransactions' => $recentTransactions,
        ]);
    }
}
