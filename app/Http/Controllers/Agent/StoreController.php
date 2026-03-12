<?php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePackagePricingRequest;
use App\Http\Requests\StoreRequest;
use App\Models\DataPackage;
use App\Models\Store;
use App\Models\StorePackagePricing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    /**
     * Get the authenticated agent's store (or null if not created yet).
     */
    public function show(Request $request): JsonResponse
    {
        $store = $request->user()->store;

        if (! $store) {
            return response()->json([
                'store' => null,
                'message' => 'You have not created a store yet.',
            ]);
        }

        $store->load('storePackagePricings.dataPackage');

        return response()->json(['store' => $store]);
    }

    /**
     * Create a store for the authenticated agent (one store per agent).
     */
    public function store(StoreRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->store) {
            return response()->json([
                'message' => 'You already have a store.',
                'store' => $user->store,
            ], 422);
        }

        $store = Store::create([
            'user_id' => $user->id,
            'name' => $request->validated()['name'],
            'is_visible' => false,
        ]);

        return response()->json([
            'message' => 'Store created successfully.',
            'store' => $store,
        ], 201);
    }

    /**
     * Update the agent's store (name, visibility).
     */
    public function update(StoreRequest $request): JsonResponse
    {
        $store = $request->user()->store;

        if (! $store) {
            return response()->json(['message' => 'Store not found.'], 404);
        }

        $validated = $request->validated();
        $store->update(array_filter([
            'name' => $validated['name'] ?? $store->name,
            'is_visible' => $validated['is_visible'] ?? $store->is_visible,
        ]));

        return response()->json([
            'message' => 'Store updated successfully.',
            'store' => $store->fresh(),
        ]);
    }

    /**
     * List package pricing for the agent's store.
     */
    public function pricingIndex(Request $request): JsonResponse
    {
        $store = $request->user()->store;

        if (! $store) {
            return response()->json(['message' => 'Store not found.'], 404);
        }

        $pricing = $store->storePackagePricings()->with('dataPackage')->get();

        return response()->json(['pricing' => $pricing]);
    }

    /**
     * Upsert a package price for the agent's store (price must be >= package vendor_price).
     */
    public function pricingStore(StorePackagePricingRequest $request): JsonResponse
    {
        $store = $request->user()->store;

        if (! $store) {
            return response()->json(['message' => 'Store not found.'], 404);
        }

        $package = DataPackage::findOrFail($request->validated()['data_package_id']);

        if (! $package->is_active) {
            return response()->json(['message' => 'Package is not active.'], 422);
        }

        $price = (float) $request->validated()['price'];
        $minPrice = (float) $package->vendor_price;

        if ($price < $minPrice) {
            return response()->json([
                'message' => "Price must be at least {$minPrice} (vendor cost).",
            ], 422);
        }

        $pricing = StorePackagePricing::updateOrCreate(
            [
                'store_id' => $store->id,
                'data_package_id' => $package->id,
            ],
            ['price' => $price]
        );

        return response()->json([
            'message' => 'Pricing updated.',
            'pricing' => $pricing->load('dataPackage'),
        ]);
    }
}
