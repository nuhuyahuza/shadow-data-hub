<?php

use App\Models\DataPackage;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;

it('can purchase data bundle when wallet has sufficient balance', function () {
    $user = User::factory()->create();
    Wallet::create([
        'user_id' => $user->id,
        'balance' => 100.00,
        'total_funded' => 100.00,
        'total_spent' => 0.00,
    ]);

    $package = DataPackage::factory()->create([
        'price' => 10.00,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->postJson('/api/data/purchase', [
        'package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233244123456',
    ]);

    $response->assertStatus(200);
    expect($user->wallet->fresh()->balance)->toBe(90.00);
    expect(Transaction::where('user_id', $user->id)->exists())->toBeTrue();
});

it('rejects purchase when wallet has insufficient balance', function () {
    $user = User::factory()->create();
    Wallet::create([
        'user_id' => $user->id,
        'balance' => 5.00,
        'total_funded' => 5.00,
        'total_spent' => 0.00,
    ]);

    $package = DataPackage::factory()->create([
        'price' => 10.00,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->postJson('/api/data/purchase', [
        'package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233244123456',
    ]);

    $response->assertStatus(422);
});
