<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * List all users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('wallet');

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
