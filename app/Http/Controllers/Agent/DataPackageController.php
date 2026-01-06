<?php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Controller;
use App\Models\DataPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataPackageController extends Controller
{
    /**
     * List all packages (read-only for agents).
     */
    public function index(Request $request): JsonResponse
    {
        $packages = DataPackage::where('is_active', true)
            ->orderBy('network')
            ->orderBy('price')
            ->paginate($request->input('per_page', 15));

        return response()->json($packages);
    }
}
