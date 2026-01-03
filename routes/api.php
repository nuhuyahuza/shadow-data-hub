<?php

use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('otp/send', [OtpController::class, 'send']);
    Route::post('otp/verify', [OtpController::class, 'verify']);
});

Route::prefix('packages')->group(function () {
    Route::get('/', [\App\Http\Controllers\DataPackageController::class, 'index']);
    Route::get('{network}', [\App\Http\Controllers\DataPackageController::class, 'show']);
});

Route::middleware('auth')->group(function () {
    Route::prefix('wallet')->group(function () {
        Route::get('/', [WalletController::class, 'index']);
        Route::post('fund', [WalletController::class, 'fund']);
    });

    Route::post('data/purchase', [\App\Http\Controllers\DataPurchaseController::class, 'store']);

    Route::prefix('transactions')->group(function () {
        Route::get('/', [\App\Http\Controllers\TransactionController::class, 'index']);
        Route::get('{id}', [\App\Http\Controllers\TransactionController::class, 'show']);
    });
});

// Webhook route (no auth required, but should verify signature in production)
Route::post('wallet/webhook', [WalletController::class, 'webhook']);

// Admin routes
Route::middleware(['auth', \App\Http\Middleware\EnsureUserIsAdmin::class])
    ->prefix('admin')
    ->group(function () {
        Route::get('dashboard', [\App\Http\Controllers\Admin\AdminDashboardController::class, 'index']);
        Route::get('users', [\App\Http\Controllers\Admin\UserController::class, 'index']);
        Route::patch('users/{id}', [\App\Http\Controllers\Admin\UserController::class, 'update']);
        Route::get('packages', [\App\Http\Controllers\Admin\DataPackageController::class, 'index']);
        Route::post('packages', [\App\Http\Controllers\Admin\DataPackageController::class, 'store']);
        Route::patch('packages/{id}', [\App\Http\Controllers\Admin\DataPackageController::class, 'update']);
        Route::get('transactions', [\App\Http\Controllers\Admin\TransactionController::class, 'index']);
        Route::post('transactions/{id}/refund', [\App\Http\Controllers\Admin\TransactionController::class, 'refund']);
        Route::get('vendor-logs', [\App\Http\Controllers\Admin\VendorLogController::class, 'index']);
    });
