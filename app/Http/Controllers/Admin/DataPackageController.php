<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DataPackageController extends Controller
{
    /**
     * List all packages.
     */
    public function index(Request $request): JsonResponse
    {
        $packages = DataPackage::orderBy('network')
            ->orderBy('price')
            ->paginate($request->input('per_page', 15));

        return response()->json($packages);
    }

    /**
     * Create new package.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'network' => ['required', Rule::in(['mtn', 'telecel', 'airteltigo'])],
            'name' => ['required', 'string', 'max:255'],
            'data_size' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'vendor_price' => ['required', 'numeric', 'min:0'],
            'validity' => ['required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $package = DataPackage::create($validated);

        return response()->json($package, 201);
    }

    /**
     * Update package.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'network' => ['sometimes', Rule::in(['mtn', 'telecel', 'airteltigo'])],
            'name' => ['sometimes', 'string', 'max:255'],
            'data_size' => ['sometimes', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'vendor_price' => ['sometimes', 'numeric', 'min:0'],
            'validity' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $package = DataPackage::findOrFail($id);
        $package->update($validated);

        return response()->json($package->fresh());
    }
}
