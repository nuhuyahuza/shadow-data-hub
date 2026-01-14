<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthController extends Controller
{
    /**
     * Health check endpoint.
     */
    public function check(): JsonResponse
    {
        $status = [
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'services' => [],
        ];

        // Check database
        try {
            DB::connection()->getPdo();
            $status['services']['database'] = 'ok';
        } catch (\Exception $e) {
            $status['services']['database'] = 'error';
            $status['status'] = 'degraded';
        }

        // Check cache (if Redis is configured)
        if (config('cache.default') === 'redis') {
            try {
                Redis::connection()->ping();
                $status['services']['cache'] = 'ok';
            } catch (\Exception $e) {
                $status['services']['cache'] = 'error';
                $status['status'] = 'degraded';
            }
        }

        $httpStatus = $status['status'] === 'ok' ? 200 : 503;

        return response()->json($status, $httpStatus);
    }
}

