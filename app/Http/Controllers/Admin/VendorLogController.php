<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VendorLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendorLogController extends Controller
{
    /**
     * List vendor logs.
     */
    public function index(Request $request): JsonResponse
    {
        $query = VendorLog::with('transaction')->latest();

        if ($request->has('transaction_id')) {
            $query->where('transaction_id', $request->input('transaction_id'));
        }

        $logs = $query->paginate($request->input('per_page', 15));

        return response()->json($logs);
    }
}
