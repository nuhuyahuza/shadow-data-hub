<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {}

    /**
     * List all users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('wallet');

        if ($request->has('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate($request->input('per_page', 15));

        return response()->json($users);
    }

    /**
     * Create a new user.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'phone' => ['nullable', 'string', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['user', 'agent', 'admin'])],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'email_verified_at' => now(),
        ]);

        // Create wallet for the user
        $this->walletService->getWallet($user);

        return response()->json($user->load('wallet'), 201);
    }

    /**
     * Update user (suspend, promote to agent, etc.).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['sometimes', Rule::in(['user', 'agent', 'admin'])],
            'name' => ['sometimes', 'string', 'max:255'],
        ]);

        $user = User::findOrFail($id);
        $user->update($validated);

        return response()->json($user->fresh());
    }
}
