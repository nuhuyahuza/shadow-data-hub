<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    $packages = \App\Models\DataPackage::where('is_active', true)
        ->orderBy('network')
        ->orderBy('price')
        ->get();

    return Inertia::render('welcome', [
        'packages' => $packages,
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

// Health check endpoint
Route::get('health', [\App\Http\Controllers\HealthController::class, 'check']);

// Auth routes (phone-based OTP)
Route::get('auth/phone-login', function () {
    return Inertia::render('auth/phone-login');
})->name('phone-login')->middleware('guest');

Route::get('auth/otp-verify', function () {
    return Inertia::render('auth/otp-verify');
})->name('otp-verify')->middleware('guest');

// Guest checkout route
Route::get('checkout/{packageId}', function ($packageId) {
    $package = \App\Models\DataPackage::findOrFail($packageId);
    return Inertia::render('checkout', ['package' => $package]);
})->name('checkout');

// Payment success callback page (for Paystack redirect - avoids localhost blocking)
Route::get('payment/success', function () {
    $reference = request()->query('reference');
    return Inertia::render('payment-success', ['reference' => $reference]);
})->name('payment.success');

// OTP API endpoints (using web middleware for session support)
Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('otp/send', [\App\Http\Controllers\Auth\OtpController::class, 'send'])->middleware('throttle:3,5');
    Route::post('otp/verify', [\App\Http\Controllers\Auth\OtpController::class, 'verify'])->middleware('throttle:5,1');
});

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');
    Route::get('wallet', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        $walletService = app(\App\Services\WalletService::class);
        $wallet = $walletService->getWallet($user);

        return Inertia::render('wallet', ['wallet' => $wallet]);
    })->name('wallet');
    Route::get('buy-data', function () {
        return Inertia::render('buy-data');
    })->name('buy-data');
    Route::get('packages', function () {
        return Inertia::render('packages');
    })->name('packages');
    Route::get('transactions', function () {
        return Inertia::render('transactions');
    })->name('transactions');

    // Admin routes
    Route::middleware([\App\Http\Middleware\EnsureUserIsAdmin::class])->group(function () {
        Route::get('admin/dashboard', function () {
            return Inertia::render('admin/dashboard');
        })->name('admin.dashboard');
        Route::get('admin/users', function () {
            return Inertia::render('admin/users');
        })->name('admin.users');
        Route::get('admin/packages', function () {
            return Inertia::render('admin/packages');
        })->name('admin.packages');
        Route::get('admin/transactions', function () {
            return Inertia::render('admin/transactions');
        })->name('admin.transactions');
        Route::get('admin/vendor-logs', function () {
            return Inertia::render('admin/vendor-logs');
        })->name('admin.vendor-logs');
    });
});

require __DIR__.'/settings.php';
