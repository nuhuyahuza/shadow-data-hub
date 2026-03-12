<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\AgentRegistrationRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AgentRegistrationController extends Controller
{
    /**
     * Show the agent registration form.
     */
    public function show(): Response
    {
        return Inertia::render('auth/agent-register');
    }

    /**
     * Register a new agent.
     */
    public function store(AgentRegistrationRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => $validated['password'],
            'role' => 'agent',
        ]);

        Auth::login($user);

        return redirect()->route('agent.store')->with('success', 'Account created successfully. You can now create your store.');
    }
}
