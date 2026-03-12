<?php

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->group('subdomain');

beforeEach(function () {
    config()->set('app.domain', 'example.com');
    config()->set('app.reserved_subdomains', ['www', 'api', 'admin', 'app']);
});

it('does not set store on request when host is main domain', function () {
    $response = $this->get('https://example.com/', [
        'Host' => 'example.com',
    ]);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('welcome'));
});

it('does not set store when subdomain is reserved', function () {
    $response = $this->get('https://www.example.com/', [
        'Host' => 'www.example.com',
    ]);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('welcome'));
});

it('resolves store when subdomain matches visible store slug', function () {
    $user = User::factory()->create();
    Store::create([
        'user_id' => $user->id,
        'name' => 'My Shop',
        'slug' => 'my-shop',
        'is_visible' => true,
    ]);

    $response = $this->get('https://my-shop.example.com/', [
        'Host' => 'my-shop.example.com',
    ]);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('storefront')
        ->where('store.name', 'My Shop')
        ->where('store.slug', 'my-shop')
    );
});

it('returns 404 when subdomain does not match any visible store', function () {
    $response = $this->get('https://unknown-slug.example.com/', [
        'Host' => 'unknown-slug.example.com',
    ]);

    $response->assertNotFound();
});

it('returns 404 when subdomain matches store that is not visible', function () {
    $user = User::factory()->create();
    Store::create([
        'user_id' => $user->id,
        'name' => 'Hidden Store',
        'slug' => 'hidden-store',
        'is_visible' => false,
    ]);

    $response = $this->get('https://hidden-store.example.com/', [
        'Host' => 'hidden-store.example.com',
    ]);

    $response->assertNotFound();
});
