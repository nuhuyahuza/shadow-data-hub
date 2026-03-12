<?php

use App\Models\User;

it('shows agent registration page', function () {
    $response = $this->get(route('agent-register'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('auth/agent-register'));
});

it('registers a new agent with first name last name email phone password', function () {
    $response = $this->post('/auth/agent-register', [
        'first_name' => 'Jane',
        'last_name' => 'Doe',
        'email' => 'agent@example.com',
        'phone' => '0551234567',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response->assertRedirect();
    expect(User::where('email', 'agent@example.com')->first())->not->toBeNull()
        ->and(User::where('email', 'agent@example.com')->first()->role)->toBe('agent')
        ->and(User::where('email', 'agent@example.com')->first()->first_name)->toBe('Jane')
        ->and(User::where('email', 'agent@example.com')->first()->last_name)->toBe('Doe')
        ->and(User::where('email', 'agent@example.com')->first()->phone)->toBe('0551234567');
});

it('validates required fields on agent registration', function () {
    $response = $this->postJson('/auth/agent-register', []);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'phone', 'password']);
});

it('rejects duplicate email on agent registration', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $response = $this->postJson('/auth/agent-register', [
        'first_name' => 'Jane',
        'last_name' => 'Doe',
        'email' => 'taken@example.com',
        'phone' => '0551234567',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['email']);
});
