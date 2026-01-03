<?php

use App\Models\User;
use App\Models\Wallet;
use App\Services\WalletService;

beforeEach(function () {
    $this->user = User::factory()->create();
    Wallet::create([
        'user_id' => $this->user->id,
        'balance' => 100.00,
        'total_funded' => 100.00,
        'total_spent' => 0.00,
    ]);
    $this->walletService = app(WalletService::class);
});

it('can get wallet balance', function () {
    $wallet = $this->walletService->getWallet($this->user);

    expect($wallet['balance'])->toBe(100.00);
});

it('can deduct from wallet', function () {
    $deducted = $this->walletService->deduct(
        $this->user,
        50.00,
        'TEST-REF-123'
    );

    expect($deducted)->toBeTrue();
    expect($this->user->wallet->fresh()->balance)->toBe(50.00);
});

it('cannot deduct more than balance', function () {
    $deducted = $this->walletService->deduct(
        $this->user,
        200.00,
        'TEST-REF-123'
    );

    expect($deducted)->toBeFalse();
    expect($this->user->wallet->fresh()->balance)->toBe(100.00);
});
