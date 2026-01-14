<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\User;
use App\Services\VendorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminDashboardController extends Controller
{
    public function __construct(
        protected VendorService $vendorService
    ) {}

    /**
     * Get comprehensive admin dashboard data.
     */
    public function index(Request $request): JsonResponse
    {
        // Basic Statistics
        $totalUsers = User::count();
        $totalRevenue = Transaction::where('type', 'purchase')
            ->where('status', 'success')
            ->sum('amount');
        $totalProfit = Transaction::where('type', 'purchase')
            ->where('status', 'success')
            ->with('package')
            ->get()
            ->sum(function ($transaction) {
                if ($transaction->package) {
                    return $transaction->amount - $transaction->package->vendor_price;
                }

                return 0;
            });
        $vendorBalance = $this->vendorService->getBalance();
        $pendingTransactions = Transaction::where('status', 'pending')->count();
        $failedTransactions = Transaction::where('status', 'failed')->count();
        $todayRevenue = Transaction::where('type', 'purchase')
            ->where('status', 'success')
            ->whereDate('created_at', today())
            ->sum('amount');

        // Revenue trends (last 30 days)
        $revenueTrends = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $amount = Transaction::where('type', 'purchase')
                ->where('status', 'success')
                ->whereDate('created_at', $date)
                ->sum('amount');
            $revenueTrends[] = [
                'date' => $date->format('Y-m-d'),
                'amount' => (float) $amount,
            ];
        }

        // User growth (last 30 days)
        $userGrowth = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $count = User::whereDate('created_at', $date)->count();
            $userGrowth[] = [
                'date' => $date->format('Y-m-d'),
                'count' => $count,
            ];
        }

        // Transactions by status
        $transactionsByStatus = [
            'success' => Transaction::where('status', 'success')->count(),
            'failed' => Transaction::where('status', 'failed')->count(),
            'pending' => Transaction::where('status', 'pending')->count(),
        ];

        // Recent activity (last 20 items)
        $recentTransactions = Transaction::with(['user', 'package'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($transaction) {
                return [
                    'type' => 'transaction',
                    'data' => [
                        'id' => $transaction->id,
                        'reference' => $transaction->reference,
                        'user_name' => $transaction->user?->name ?? 'Guest',
                        'amount' => $transaction->amount,
                        'status' => $transaction->status,
                        'package_name' => $transaction->package?->name,
                    ],
                    'timestamp' => $transaction->created_at->toIso8601String(),
                ];
            });

        $recentUsers = User::latest()
            ->limit(10)
            ->get()
            ->map(function ($user) {
                return [
                    'type' => 'user_registration',
                    'data' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'role' => $user->role,
                    ],
                    'timestamp' => $user->created_at->toIso8601String(),
                ];
            });

        $recentActivity = $recentTransactions->concat($recentUsers)
            ->sortByDesc('timestamp')
            ->values()
            ->take(15)
            ->toArray();

        // System status
        $vendorApiHealthy = true; // TODO: Implement actual health check
        try {
            $this->vendorService->getBalance();
        } catch (\Exception $e) {
            $vendorApiHealthy = false;
        }

        return response()->json([
            'stats' => [
                'total_users' => $totalUsers,
                'total_revenue' => $totalRevenue,
                'total_profit' => $totalProfit,
                'vendor_balance' => $vendorBalance,
                'pending_transactions' => $pendingTransactions,
                'failed_transactions' => $failedTransactions,
                'today_revenue' => $todayRevenue,
            ],
            'charts' => [
                'revenue_trends' => $revenueTrends,
                'user_growth' => $userGrowth,
                'transactions_by_status' => $transactionsByStatus,
            ],
            'recent_activity' => $recentActivity,
            'system_status' => [
                'vendor_balance' => $vendorBalance,
                'vendor_api_healthy' => $vendorApiHealthy,
                'pending_count' => $pendingTransactions,
            ],
        ]);
    }
}
