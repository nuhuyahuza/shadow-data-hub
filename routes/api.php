<?php

use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('packages')->group(function () {
    Route::get('/', [\App\Http\Controllers\DataPackageController::class, 'index']);
    Route::get('{network}', [\App\Http\Controllers\DataPackageController::class, 'show']);
});

// Guest purchase routes (no auth required)
Route::prefix('guest')->middleware('throttle:20,1')->group(function () {
    Route::post('purchase', [\App\Http\Controllers\GuestPurchaseController::class, 'store']);
    Route::post('payment/webhook', [\App\Http\Controllers\GuestPurchaseController::class, 'webhook']);
    // Rate limit status checks to prevent excessive polling
    Route::get('payment/status/{reference}', [\App\Http\Controllers\GuestPurchaseController::class, 'checkStatus'])
        ->middleware('throttle:30,1'); // 30 requests per minute per IP
});

Route::middleware(['web', 'auth', 'throttle:60,1'])->group(function () {
    Route::prefix('wallet')->group(function () {
        Route::get('/', [WalletController::class, 'index']);
        Route::post('fund', [WalletController::class, 'fund'])->middleware('throttle:10,1');
        Route::get('status/{reference}', [WalletController::class, 'checkStatus'])->middleware('throttle:30,1');
    });

    Route::post('data/purchase', [\App\Http\Controllers\DataPurchaseController::class, 'store'])
        ->middleware('throttle:20,1');

    Route::prefix('transactions')->group(function () {
        Route::get('/', [\App\Http\Controllers\TransactionController::class, 'index']);
        Route::get('{id}', [\App\Http\Controllers\TransactionController::class, 'show']);
    });
});

// Webhook route (no auth required, but should verify signature in production)
Route::post('wallet/webhook', [WalletController::class, 'webhook']);

// Agent routes (with session middleware for cookie-based auth)
Route::middleware(['web', 'auth', 'throttle:120,1', \App\Http\Middleware\EnsureUserIsAgent::class])
    ->prefix('agent')
    ->group(function () {
        Route::get('transactions', [\App\Http\Controllers\Agent\TransactionController::class, 'index']);
        Route::post('transactions/{id}/fulfill', [\App\Http\Controllers\Agent\TransactionController::class, 'fulfill']);
        Route::get('users', [\App\Http\Controllers\Agent\UserController::class, 'index']);
        Route::get('packages', [\App\Http\Controllers\Agent\DataPackageController::class, 'index']);
    });

// Admin routes (with session middleware for cookie-based auth)
Route::middleware(['web', 'auth', 'throttle:120,1', \App\Http\Middleware\EnsureUserIsAdmin::class])
    ->prefix('admin')
    ->group(function () {
        Route::get('dashboard', [\App\Http\Controllers\Admin\AdminDashboardController::class, 'index']);
        Route::get('users', [\App\Http\Controllers\Admin\UserController::class, 'index']);
        Route::post('users', [\App\Http\Controllers\Admin\UserController::class, 'store']);
        Route::patch('users/{id}', [\App\Http\Controllers\Admin\UserController::class, 'update']);
        Route::get('packages', [\App\Http\Controllers\Admin\DataPackageController::class, 'index']);
        Route::post('packages', [\App\Http\Controllers\Admin\DataPackageController::class, 'store']);
        Route::patch('packages/{id}', [\App\Http\Controllers\Admin\DataPackageController::class, 'update']);
        Route::get('transactions', [\App\Http\Controllers\Admin\TransactionController::class, 'index']);
        Route::post('transactions/{id}/fulfill', [\App\Http\Controllers\Admin\TransactionController::class, 'fulfill']);
        Route::post('transactions/{id}/refund', [\App\Http\Controllers\Admin\TransactionController::class, 'refund']);
        Route::get('vendor-logs', [\App\Http\Controllers\Admin\VendorLogController::class, 'index']);
    });
