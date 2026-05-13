<?php

use App\Models\DataPackage;
use App\Models\Network;
use App\Models\Order;
use App\Models\Store;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Str;

it('uses uuid string primary keys and foreign keys for domain tables', function () {
    $user = User::factory()->create();

    $network = Network::create([
        'name' => 'Test Network',
        'code' => 'testnet-'.Str::lower(Str::random(6)),
        'is_active' => true,
    ]);
    expect($network->id)->toBeString()
        ->and(Str::isUuid($network->id))->toBeTrue();

    $package = DataPackage::factory()->create([
        'network_id' => $network->id,
        'network' => 'mtn',
        'is_active' => true,
    ]);
    expect($package->id)->toBeString()
        ->and(Str::isUuid($package->id))->toBeTrue()
        ->and($package->network_id)->toBe($network->id);

    $wallet = Wallet::create([
        'user_id' => $user->id,
        'balance' => 0,
        'total_funded' => 0,
        'total_spent' => 0,
    ]);
    expect($wallet->id)->toBeString()->and(Str::isUuid($wallet->id))->toBeTrue();

    $store = Store::create([
        'user_id' => $user->id,
        'name' => 'Test Store',
        'slug' => 'test-store-'.Str::lower(Str::random(4)),
        'is_visible' => true,
    ]);
    expect($store->id)->toBeString()->and(Str::isUuid($store->id))->toBeTrue();

    $transaction = Transaction::create([
        'user_id' => $user->id,
        'reference' => 'TXN-UUID-FK-TEST',
        'type' => 'purchase',
        'amount' => 5.00,
        'status' => 'success',
        'package_id' => $package->id,
        'phone_number' => '233241234567',
    ]);
    expect($transaction->id)->toBeString()->and(Str::isUuid($transaction->id))->toBeTrue();

    $order = Order::create([
        'user_id' => $user->id,
        'transaction_id' => $transaction->id,
        'store_id' => $store->id,
        'data_package_id' => $package->id,
        'network' => 'mtn',
        'phone_number' => '233241234567',
        'amount' => 5.00,
        'status' => 'fulfilled',
    ]);
    expect($order->id)->toBeString()
        ->and(Str::isUuid($order->id))->toBeTrue()
        ->and($order->transaction_id)->toBe($transaction->id)
        ->and($order->store_id)->toBe($store->id)
        ->and($order->data_package_id)->toBe($package->id);

    $order->load(['transaction', 'store', 'dataPackage']);
    expect($order->transaction->id)->toBe($transaction->id)
        ->and($order->store->id)->toBe($store->id)
        ->and($order->dataPackage->id)->toBe($package->id);
});
