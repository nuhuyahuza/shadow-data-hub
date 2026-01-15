<?php

use App\Models\DataPackage;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\Http;

function buildPaystackSignature(string $payload, string $secret): string
{
    return hash_hmac('sha512', $payload, $secret);
}

it('processes wallet funding webhook on the unified endpoint', function () {
    config()->set('services.payment.gateway', 'paystack');
    config()->set('services.payment.paystack.webhook_secret', 'test-secret');

    $user = User::factory()->create();
    Wallet::create([
        'user_id' => $user->id,
        'balance' => 0.00,
        'total_funded' => 0.00,
        'total_spent' => 0.00,
    ]);

    $transaction = Transaction::create([
        'user_id' => $user->id,
        'reference' => 'FUND-TEST-123',
        'type' => 'funding',
        'amount' => 50.00,
        'status' => 'pending',
        'payment_method' => 'card',
    ]);

    $payload = [
        'event' => 'charge.success',
        'data' => [
            'reference' => $transaction->reference,
            'status' => 'success',
            'amount' => 5000,
            'id' => 123456,
        ],
    ];

    $payloadJson = json_encode($payload);
    $signature = buildPaystackSignature($payloadJson, 'test-secret');

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

    $transaction->refresh();
    $wallet = $user->wallet->fresh();

    expect($transaction->status)->toBe('success');
    expect((float) $wallet->balance)->toBe(50.00);
});

it('processes purchase webhook and delivers data bundle on the unified endpoint', function () {
    config()->set('services.payment.gateway', 'paystack');
    config()->set('services.payment.paystack.webhook_secret', 'test-secret');
    config()->set('services.vendor.endpoint', 'https://vendor.test');
    config()->set('services.vendor.api_key', 'test-key');

    Http::fake([
        'https://vendor.test/purchase' => Http::response([
            'success' => true,
            'reference' => 'VENDOR-123',
            'message' => 'Purchase successful',
        ], 200),
    ]);

    $user = User::factory()->create();
    $package = DataPackage::create([
        'network' => 'mtn',
        'name' => 'Test Package',
        'data_size' => '1GB',
        'price' => 10.00,
        'validity' => '30 days',
        'vendor_price' => 8.00,
        'is_active' => true,
    ]);

    $transaction = Transaction::create([
        'user_id' => $user->id,
        'reference' => 'TXN-TEST-456',
        'type' => 'purchase',
        'amount' => 10.00,
        'status' => 'pending',
        'package_id' => $package->id,
        'phone_number' => '233241234567',
        'payment_method' => 'card',
    ]);

    $payload = [
        'event' => 'charge.success',
        'data' => [
            'reference' => $transaction->reference,
            'status' => 'success',
            'amount' => 1000,
            'id' => 654321,
        ],
    ];

    $payloadJson = json_encode($payload);
    $signature = buildPaystackSignature($payloadJson, 'test-secret');

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

    $transaction->refresh();

    expect($transaction->status)->toBe('success');
    expect($transaction->vendor_reference)->toBe('VENDOR-123');
});
