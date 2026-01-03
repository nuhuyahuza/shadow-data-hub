<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\User;
use App\Services\VendorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function __construct(
        protected VendorService $vendorService
    ) {}

    /**
     * Get admin dashboard stats.
     */
    public function index(Request $request): JsonResponse
    {
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

        return response()->json([
            'total_users' => $totalUsers,
            'total_revenue' => $totalRevenue,
            'total_profit' => $totalProfit,
            'vendor_balance' => $vendorBalance,
        ]);
    }
}
