<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    $store = request()->attributes->get('store');

    if ($store) {
        $store->load(['storePackagePricings' => function ($q) {
            $q->whereHas('dataPackage', fn ($q) => $q->where('is_active', true))
                ->with('dataPackage');
        }]);
        $packages = $store->storePackagePricings->map(function ($pricing) {
            $pkg = $pricing->dataPackage;

            return [
                'id' => $pkg->id,
                'network' => $pkg->network,
                'name' => $pkg->name,
                'data_size' => $pkg->data_size,
                'price' => $pricing->price,
                'validity' => $pkg->validity,
                'is_active' => $pkg->is_active,
            ];
        })->values()->all();

        return Inertia::render('storefront', [
            'store' => $store->only('id', 'name', 'slug'),
            'packages' => $packages,
        ]);
    }

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

// Admin login routes (password-based with 2FA)
Route::get('auth/admin-login', function () {
    return Inertia::render('auth/admin-login');
})->name('admin-login')->middleware('guest');

Route::get('auth/admin/two-factor-challenge', function () {
    return Inertia::render('auth/admin-two-factor-challenge');
})->name('admin.two-factor.challenge')->middleware('guest');

// Agent login routes (password-based with 2FA)
Route::get('auth/agent-login', function () {
    return Inertia::render('auth/agent-login');
})->name('agent-login')->middleware('guest');

Route::get('auth/agent-register', [\App\Http\Controllers\Auth\AgentRegistrationController::class, 'show'])->name('agent-register')->middleware('guest');

Route::get('auth/agent/two-factor-challenge', function () {
    return Inertia::render('auth/agent-two-factor-challenge');
})->name('agent.two-factor.challenge')->middleware('guest');

// Guest checkout route
Route::get('checkout/{packageId}', function ($packageId) {
    $package = \App\Models\DataPackage::findOrFail($packageId);
    $storeId = request()->query('store_id');

    return Inertia::render('checkout', [
        'package' => $package,
        'storeId' => $storeId ? (string) $storeId : null,
    ]);
})->name('checkout');

// Payment success callback page (for Paystack redirect - avoids localhost blocking)
Route::get('payment/success', function () {
    $reference = request()->query('reference');

    return Inertia::render('payment-success', ['reference' => $reference]);
})->name('payment.success');

// Track order (public, no auth)
Route::get('track-order', [\App\Http\Controllers\OrderTrackingController::class, 'show'])->name('track-order');

// OTP API endpoints (using web middleware for session support)
Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('otp/send', [\App\Http\Controllers\Auth\OtpController::class, 'send'])->middleware('throttle:3,5');
    Route::post('otp/verify', [\App\Http\Controllers\Auth\OtpController::class, 'verify'])->middleware('throttle:5,1');
    // Admin login (password-based, requires web middleware for session)
    Route::post('admin/login', [\App\Http\Controllers\Auth\AdminLoginController::class, 'login'])->middleware('throttle:5,1');
    Route::post('admin/two-factor-challenge', [\App\Http\Controllers\Auth\AdminLoginController::class, 'twoFactorChallenge'])->middleware('throttle:5,1');
    // Agent login (password-based, requires web middleware for session)
    Route::post('agent/login', [\App\Http\Controllers\Auth\AgentLoginController::class, 'login'])->middleware('throttle:5,1');
    Route::post('agent/two-factor-challenge', [\App\Http\Controllers\Auth\AgentLoginController::class, 'twoFactorChallenge'])->middleware('throttle:5,1');
    // Agent registration (self-signup)
    Route::post('agent-register', [\App\Http\Controllers\Auth\AgentRegistrationController::class, 'store'])->middleware('throttle:5,1');
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

    // Agent routes
    Route::middleware([\App\Http\Middleware\EnsureUserIsAgent::class])->prefix('agent')->group(function () {
        Route::get('transactions', function () {
            return Inertia::render('agent/transactions');
        })->name('agent.transactions');
        Route::get('purchases', function () {
            return Inertia::render('agent/purchases');
        })->name('agent.purchases');
        Route::get('packages', function () {
            return Inertia::render('agent/packages');
        })->name('agent.packages');
        Route::get('store', function () {
            return Inertia::render('agent/store');
        })->name('agent.store');
    });

    // Admin routes
    Route::middleware([\App\Http\Middleware\EnsureUserIsAdmin::class])->prefix('admin')->group(function () {
        Route::get('/', function () {
            return redirect()->route('admin.dashboard');
        })->name('admin');
        Route::get('dashboard', function () {
            return Inertia::render('admin/dashboard');
        })->name('admin.dashboard');
        Route::get('users', function () {
            return Inertia::render('admin/users');
        })->name('admin.users');
        Route::get('packages', function () {
            return Inertia::render('admin/packages');
        })->name('admin.packages');
        Route::get('transactions', function () {
            return Inertia::render('admin/transactions');
        })->name('admin.transactions');
        Route::get('purchases', function () {
            return Inertia::render('admin/purchases');
        })->name('admin.purchases');
        Route::get('agents', function () {
            return Inertia::render('admin/agents');
        })->name('admin.agents');
        Route::get('vendor-logs', function () {
            return Inertia::render('admin/vendor-logs');
        })->name('admin.vendor-logs');
    });
});

require __DIR__.'/settings.php';
