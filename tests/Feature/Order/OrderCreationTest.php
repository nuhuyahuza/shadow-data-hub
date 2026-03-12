<?php

use App\Models\DataPackage;
use App\Models\Network;
use App\Models\Order;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\Http;

it('creates order when wallet purchase succeeds', function () {
    config()->set('services.vendor.endpoint', 'https://vendor.test');
    config()->set('services.vendor.api_key', 'test-key');
    Http::fake([
        'https://vendor.test/purchase' => Http::response([
            'success' => true,
            'reference' => 'VENDOR-123',
            'message' => 'OK',
        ], 200),
    ]);

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

    $response->assertOk();
    $transaction = Transaction::where('user_id', $user->id)->where('type', 'purchase')->first();
    expect($transaction)->not->toBeNull()->and($transaction->status)->toBe('success');

    $order = Order::where('transaction_id', $transaction->id)->first();
    expect($order)->not->toBeNull()
        ->and($order->data_package_id)->toBe($package->id)
        ->and((float) $order->amount)->toBe(10.0);
});

it('creates order when webhook receives charge.success for purchase', function () {
    config()->set('services.payment.gateway', 'paystack');
    config()->set('services.payment.paystack.webhook_secret', 'test-secret');
    config()->set('services.vendor.endpoint', 'https://vendor.test');
    config()->set('services.vendor.api_key', 'test-key');

    Http::fake([
        'https://vendor.test/purchase' => Http::response([
            'success' => true,
            'reference' => 'VENDOR-REF',
            'message' => 'OK',
        ], 200),
    ]);

    $user = User::factory()->create();
    $package = DataPackage::factory()->create([
        'network' => 'mtn',
        'price' => 10.00,
        'vendor_price' => 8.00,
        'is_active' => true,
    ]);

    $transaction = Transaction::create([
        'user_id' => $user->id,
        'reference' => 'TXN-WEBHOOK-ORDER',
        'type' => 'purchase',
        'amount' => 10.00,
        'status' => 'pending',
        'package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'payment_method' => 'card',
    ]);

    $payload = [
        'event' => 'charge.success',
        'data' => [
            'reference' => $transaction->reference,
            'status' => 'success',
            'amount' => 1000,
            'id' => 999,
        ],
    ];

    $payloadJson = json_encode($payload);
    $signature = hash_hmac('sha512', $payloadJson, 'test-secret');

    $response = $this->call(
        'POST',
        '/api/wallet/webhook',
        [],
        [],
        [],
        [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
        ],
        $payloadJson
    );

    $response->assertOk();

    $order = Order::where('transaction_id', $transaction->id)->first();
    expect($order)->not->toBeNull()
        ->and($order->user_id)->toBe($user->id)
        ->and($order->data_package_id)->toBe($package->id);
});

it('rejects purchase when package is inactive', function () {
    $user = User::factory()->create();
    Wallet::create([
        'user_id' => $user->id,
        'balance' => 100.00,
        'total_funded' => 100.00,
        'total_spent' => 0.00,
    ]);

    $package = DataPackage::factory()->create([
        'price' => 10.00,
        'is_active' => false,
    ]);

    $response = $this->actingAs($user)->postJson('/api/data/purchase', [
        'package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233244123456',
    ]);

    $response->assertStatus(422);
    $response->assertJsonFragment(['message' => 'This package is not available']);
});
