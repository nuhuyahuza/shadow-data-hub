<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Network;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NetworkController extends Controller
{
    /**
     * List all networks.
     */
    public function index(Request $request): JsonResponse
    {
        $networks = Network::orderBy('code')->paginate($request->input('per_page', 15));

        return response()->json($networks);
    }

    /**
     * Create a new network.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:networks,code'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $network = Network::create(array_merge($validated, ['is_active' => $validated['is_active'] ?? true]));

        return response()->json($network, 201);
    }

    /**
     * Update a network.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $network = Network::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:50', 'unique:networks,code,'.$id],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $network->update($validated);

        return response()->json($network->fresh());
    }
}
