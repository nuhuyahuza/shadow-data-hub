<?php

use App\Models\DataPackage;
use App\Models\Network;
use App\Models\Store;
use App\Models\StorePackagePricing;
use App\Models\User;

beforeEach(function () {
    $this->agent = User::factory()->create(['role' => 'agent']);
});

it('agent can create a store', function () {
    $response = $this->actingAs($this->agent)->postJson('/api/agent/store', [
        'name' => 'My Data Shop',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('store.name', 'My Data Shop');
    $response->assertJsonPath('store.is_visible', false);

    expect(Store::where('user_id', $this->agent->id)->first())->not->toBeNull();
});

it('agent cannot create a second store', function () {
    Store::create([
        'user_id' => $this->agent->id,
        'name' => 'First Store',
        'is_visible' => false,
    ]);

    $response = $this->actingAs($this->agent)->postJson('/api/agent/store', [
        'name' => 'Second Store',
    ]);

    $response->assertStatus(422);
});

it('agent can update store visibility', function () {
    $store = Store::create([
        'user_id' => $this->agent->id,
        'name' => 'My Store',
        'is_visible' => false,
    ]);

    $response = $this->actingAs($this->agent)->patchJson('/api/agent/store', [
        'name' => 'My Store',
        'is_visible' => true,
    ]);

    $response->assertOk();
    expect($store->fresh()->is_visible)->toBeTrue();
});

it('agent can set package pricing for store', function () {
    $network = Network::first() ?? Network::create(['name' => 'MTN', 'code' => 'mtn', 'is_active' => true]);
    $package = DataPackage::factory()->create([
        'network_id' => $network->id,
        'network' => $network->code,
        'vendor_price' => 5.00,
        'price' => 10.00,
        'is_active' => true,
    ]);
    $store = Store::create([
        'user_id' => $this->agent->id,
        'name' => 'My Store',
        'is_visible' => true,
    ]);

    $response = $this->actingAs($this->agent)->postJson('/api/agent/store/pricing', [
        'data_package_id' => $package->id,
        'price' => 12.00,
    ]);

    $response->assertOk();
    $pricing = StorePackagePricing::where('store_id', $store->id)->where('data_package_id', $package->id)->first();
    expect($pricing)->not->toBeNull()->and((float) $pricing->price)->toBe(12.0);
});

it('rejects store package price below vendor cost', function () {
    $network = Network::first() ?? Network::create(['name' => 'MTN', 'code' => 'mtn', 'is_active' => true]);
    $package = DataPackage::factory()->create([
        'network_id' => $network->id,
        'network' => $network->code,
        'vendor_price' => 10.00,
        'is_active' => true,
    ]);
    Store::create([
        'user_id' => $this->agent->id,
        'name' => 'My Store',
        'is_visible' => true,
    ]);

    $response = $this->actingAs($this->agent)->postJson('/api/agent/store/pricing', [
        'data_package_id' => $package->id,
        'price' => 5.00,
    ]);

    $response->assertStatus(422);
});
