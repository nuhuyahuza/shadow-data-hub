<?php

namespace App\Http\Controllers;

use App\Models\DataPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataPackageController extends Controller
{
    /**
     * List all active data packages.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DataPackage::active()->orderBy('price');

        // Filter by network if provided
        if ($request->has('network')) {
            $network = $request->input('network');
            if (in_array($network, ['mtn', 'telecel', 'airteltigo'])) {
                $query->forNetwork($network);
            }
        }

        $packages = $query->get();

        return response()->json($packages);
    }

    /**
     * Get packages for a specific network.
     */
    public function show(string $network): JsonResponse
    {
        if (! in_array($network, ['mtn', 'telecel', 'airteltigo'])) {
            return response()->json(['message' => 'Invalid network'], 422);
        }

        $packages = DataPackage::active()
            ->forNetwork($network)
            ->orderBy('price')
            ->get();

        return response()->json($packages);
    }
}
