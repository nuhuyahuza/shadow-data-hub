<?php

use App\Models\DataPackage;
use App\Models\Order;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->group('track-order');

beforeEach(function () {
    config()->set('app.domain', 'example.com');
});

it('shows track order page without search when no reference given', function () {
    $response = $this->get(route('track-order'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('track-order')
        ->has('searched', false)
        ->where('order', null)
        ->where('error', null)
    );
});

it('returns order not found when reference does not match any transaction', function () {
    $response = $this->get(route('track-order', ['reference' => 'NONEXISTENT-REF']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('track-order')
        ->has('searched', true)
        ->where('order', null)
        ->where('error', 'Order not found.')
    );
});

it('returns order when reference matches a purchase transaction and order exists', function () {
    $user = User::factory()->create();
    $package = DataPackage::factory()->create([
        'network' => 'mtn',
        'name' => '1GB Bundle',
        'data_size' => '1GB',
        'validity' => '30 days',
        'is_active' => true,
    ]);

    $transaction = Transaction::create([
        'user_id' => $user->id,
        'reference' => 'TXN-TRACK-001',
        'type' => 'purchase',
        'status' => 'success',
        'package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'amount' => 10.00,
        'payment_method' => 'card',
    ]);

    Order::create([
        'user_id' => $user->id,
        'transaction_id' => $transaction->id,
        'store_id' => null,
        'data_package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'amount' => 10.00,
        'status' => 'fulfilled',
        'payment_channel' => 'paystack',
    ]);

    $response = $this->get(route('track-order', ['reference' => 'TXN-TRACK-001']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('track-order')
        ->has('searched', true)
        ->where('error', null)
        ->has('order')
        ->where('order.reference', 'TXN-TRACK-001')
        ->where('order.status', 'fulfilled')
        ->where('order.phone_number', '233241234567')
    );
});

it('returns order not found when phone param does not match order phone', function () {
    $user = User::factory()->create();
    $package = DataPackage::factory()->create(['network' => 'mtn', 'is_active' => true]);

    $transaction = Transaction::create([
        'user_id' => $user->id,
        'reference' => 'TXN-PHONE-MISMATCH',
        'type' => 'purchase',
        'status' => 'success',
        'package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'amount' => 10.00,
        'payment_method' => 'card',
    ]);

    Order::create([
        'user_id' => $user->id,
        'transaction_id' => $transaction->id,
        'store_id' => null,
        'data_package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'amount' => 10.00,
        'status' => 'fulfilled',
        'payment_channel' => 'paystack',
    ]);

    $response = $this->get(route('track-order', [
        'reference' => 'TXN-PHONE-MISMATCH',
        'phone' => '233999999999',
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('searched', true)
        ->where('order', null)
        ->where('error', 'Order not found.')
    );
});

it('returns order when phone param matches order phone', function () {
    $user = User::factory()->create();
    $package = DataPackage::factory()->create(['network' => 'mtn', 'is_active' => true]);

    $transaction = Transaction::create([
        'user_id' => $user->id,
        'reference' => 'TXN-PHONE-MATCH',
        'type' => 'purchase',
        'status' => 'success',
        'package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'amount' => 10.00,
        'payment_method' => 'card',
    ]);

    Order::create([
        'user_id' => $user->id,
        'transaction_id' => $transaction->id,
        'store_id' => null,
        'data_package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'amount' => 10.00,
        'status' => 'fulfilled',
        'payment_channel' => 'paystack',
    ]);

    $response = $this->get(route('track-order', [
        'reference' => 'TXN-PHONE-MATCH',
        'phone' => '0241234567',
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('searched', true)
        ->where('error', null)
        ->where('order.reference', 'TXN-PHONE-MATCH')
    );
});

it('returns order not found when on subdomain and order belongs to different store', function () {
    $user = User::factory()->create();
    $storeA = Store::create([
        'user_id' => $user->id,
        'name' => 'Store A',
        'slug' => 'store-a',
        'is_visible' => true,
    ]);
    $storeB = Store::create([
        'user_id' => User::factory()->create()->id,
        'name' => 'Store B',
        'slug' => 'store-b',
        'is_visible' => true,
    ]);

    $package = DataPackage::factory()->create(['network' => 'mtn', 'is_active' => true]);
    $transaction = Transaction::create([
        'user_id' => $user->id,
        'reference' => 'TXN-STORE-B',
        'type' => 'purchase',
        'status' => 'success',
        'package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'amount' => 10.00,
        'payment_method' => 'card',
    ]);
    Order::create([
        'user_id' => $user->id,
        'transaction_id' => $transaction->id,
        'store_id' => $storeB->id,
        'data_package_id' => $package->id,
        'network' => $package->network,
        'phone_number' => '233241234567',
        'amount' => 10.00,
        'status' => 'fulfilled',
        'payment_channel' => 'paystack',
    ]);

    // Request as store-a subdomain: order belongs to store-b, so should not be visible
    $response = $this->get('https://store-a.example.com/track-order?reference=TXN-STORE-B', [
        'Host' => 'store-a.example.com',
    ]);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('searched', true)
        ->where('order', null)
        ->where('error', 'Order not found.')
    );
});
