<?php

namespace App\Services;

use Illuminate\Http\Request;

class WebhookService
{
    /**
     * Verify webhook signature from payment gateway.
     */
    public function verifySignature(Request $request, string $secret): bool
    {
        $gateway = config('services.payment.gateway');

        return match ($gateway) {
            'paystack' => $this->verifyPaystackSignature($request, $secret),
            'flutterwave' => $this->verifyFlutterwaveSignature($request, $secret),
            default => false,
        };
    }

    /**
     * Verify Paystack webhook signature.
     */
    protected function verifyPaystackSignature(Request $request, string $secret): bool
    {
        $signature = $request->header('X-Paystack-Signature');

        if (! $signature) {
            return false;
        }

        $payload = $request->getContent();
        $hash = hash_hmac('sha512', $payload, $secret);

        return hash_equals($hash, $signature);
    }

    /**
     * Verify Flutterwave webhook signature.
     */
    protected function verifyFlutterwaveSignature(Request $request, string $secret): bool
    {
        $signature = $request->header('verif-hash');

        if (! $signature) {
            return false;
        }

        return $signature === $secret;
    }

    /**
     * Check if request IP is whitelisted.
     */
    public function isIpWhitelisted(Request $request, array $whitelist): bool
    {
        $ip = $request->ip();

        // Allow localhost for development
        if (in_array($ip, ['127.0.0.1', '::1', 'localhost'])) {
            return true;
        }

        return in_array($ip, $whitelist);
    }

    /**
     * Get payment gateway IP whitelist.
     */
    public function getGatewayIpWhitelist(string $gateway): array
    {
        return match ($gateway) {
            'paystack' => [
                '52.31.139.75',
                '52.49.173.169',
                '52.214.14.220',
            ],
            'flutterwave' => [
                // Add Flutterwave IPs when available
            ],
            default => [],
        };
    }
}

