<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\VendorLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VendorService
{
    /**
     * Purchase data bundle from vendor.
     */
    public function purchaseData(Transaction $transaction): array
    {
        $package = $transaction->package;
        $phoneNumber = $transaction->phone_number;

        if (! $package) {
            return [
                'success' => false,
                'message' => 'Package not found',
            ];
        }

        // Prepare vendor request payload
        $requestPayload = [
            'network' => $package->network,
            'package_id' => $package->id,
            'phone' => $phoneNumber,
            'reference' => $transaction->reference,
        ];

        // Log request
        $vendorLog = VendorLog::create([
            'transaction_id' => $transaction->id,
            'request_payload' => $requestPayload,
            'status_code' => null,
        ]);

        try {
            // TODO: Replace with actual vendor API endpoint and credentials
            // This is a placeholder structure
            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => 'Bearer '.config('services.vendor.api_key', ''),
                    'Content-Type' => 'application/json',
                ])
                ->post(config('services.vendor.endpoint', 'https://api.vendor.example.com/purchase'), $requestPayload);

            $statusCode = $response->status();
            $responseData = $response->json();

            // Update vendor log
            $vendorLog->update([
                'response_payload' => $responseData,
                'status_code' => $statusCode,
                'error_message' => $statusCode !== 200 ? ($responseData['message'] ?? 'Unknown error') : null,
            ]);

            if ($statusCode === 200 && isset($responseData['success']) && $responseData['success']) {
                // Update transaction with vendor reference
                $transaction->update([
                    'vendor_reference' => $responseData['reference'] ?? null,
                    'vendor_response' => $responseData,
                    'status' => 'success',
                ]);

                return [
                    'success' => true,
                    'message' => $responseData['message'] ?? 'Data bundle purchased successfully',
                    'vendor_reference' => $responseData['reference'] ?? null,
                ];
            }

            // Vendor returned error
            $transaction->update([
                'vendor_response' => $responseData,
                'status' => 'failed',
            ]);

            return [
                'success' => false,
                'message' => $responseData['message'] ?? 'Vendor API error',
            ];
        } catch (\Exception $e) {
            // Log exception
            Log::error('Vendor API Error', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);

            $vendorLog->update([
                'error_message' => $e->getMessage(),
                'status_code' => 500,
            ]);

            $transaction->update([
                'status' => 'failed',
                'vendor_response' => ['error' => $e->getMessage()],
            ]);

            return [
                'success' => false,
                'message' => 'Failed to connect to vendor API',
            ];
        }
    }

    /**
     * Get vendor balance from API.
     */
    public function getBalance(): float
    {
        $endpoint = config('services.vendor.endpoint');
        $apiKey = config('services.vendor.api_key');

        if (! $endpoint || ! $apiKey) {
            Log::warning('Vendor API not configured');

            return 0.00;
        }

        try {
            // TODO: Implement actual vendor balance API call
            // Example:
            // $response = Http::timeout(10)
            //     ->withHeaders([
            //         'Authorization' => 'Bearer '.$apiKey,
            //     ])
            //     ->get($endpoint.'/balance');
            //
            // if ($response->successful()) {
            //     return (float) $response->json()['balance'];
            // }

            Log::info('Vendor balance check - API integration required');

            return 0.00;
        } catch (\Exception $e) {
            Log::error('Failed to get vendor balance', ['error' => $e->getMessage()]);

            return 0.00;
        }
    }
}
