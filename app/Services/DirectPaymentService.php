<?php

namespace App\Services;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DirectPaymentService
{
    public function __construct(
        protected WebhookService $webhookService
    ) {}

    /**
     * Initiate direct payment with Mobile Money gateway.
     */
    public function initiatePayment(array $data): array
    {
        $reference = $data['reference'] ?? 'PAY-'.strtoupper(uniqid());
        $amount = $data['amount'];
        $phone = $data['payment_phone'];
        $paymentMethod = $data['payment_method'] ?? 'mtn_momo';

        $gateway = config('services.payment.gateway', 'paystack');

        // Create pending transaction
        $transaction = Transaction::create([
            'user_id' => $data['user_id'],
            'reference' => $reference,
            'type' => 'purchase',
            'network' => $data['network'] ?? null,
            'package_id' => $data['package_id'] ?? null,
            'phone_number' => $data['phone_number'] ?? null,
            'amount' => $amount,
            'status' => 'pending',
            'payment_method' => $paymentMethod,
            'payment_phone' => $phone,
        ]);

        // Initialize Paystack transaction to get authorization URL
        $secretKey = config("services.payment.{$gateway}.secret_key", '');
        $publicKey = config("services.payment.{$gateway}.public_key", '');

        if (! $secretKey || ! $publicKey) {
            Log::error('Paystack credentials not configured');

            return [
                'success' => false,
                'message' => 'Payment gateway not configured',
            ];
        }

        // Initialize Paystack transaction via API
        $paystackUrl = 'https://api.paystack.co/transaction/initialize';
        // For development: use null to avoid localhost blocking
        // For production: use a public URL
        // Webhooks will handle the actual status update
        $appUrl = config('app.url');
        $callbackUrl = (str_contains($appUrl, 'localhost') || str_contains($appUrl, '127.0.0.1'))
            ? null // Don't set callback URL for localhost to avoid browser blocking
            : $appUrl.'/payment/success';

        $paystackData = [
            'email' => $phone.'@datahub.gh', // Use phone as email identifier
            'amount' => $amount * 100, // Convert to pesewas
            'currency' => 'GHS',
            'reference' => $reference,
            'metadata' => [
                'recipient_phone' => $data['phone_number'] ?? null,
                'package_name' => $data['package_name'] ?? null,
                'transaction_id' => $transaction->id,
            ],
        ];

        // Only add callback_url if it's not null (not localhost) to avoid browser blocking
        if ($callbackUrl) {
            $paystackData['callback_url'] = $callbackUrl;
        }

        try {
            $ch = curl_init($paystackUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paystackData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer '.$secretKey,
                'Content-Type: application/json',
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $responseData = json_decode($response, true);

                if ($responseData['status'] && isset($responseData['data']['authorization_url'])) {
                    $authorizationUrl = $responseData['data']['authorization_url'];

                    Log::info('Paystack transaction initialized', [
                        'reference' => $reference,
                        'authorization_url' => $authorizationUrl,
                    ]);

                    return [
                        'success' => true,
                        'reference' => $reference,
                        'transaction_id' => $transaction->id,
                        'payment_url' => $authorizationUrl, // URL to embed in iframe
                        'public_key' => $publicKey,
                        'message' => 'Payment ready. Please complete payment.',
                    ];
                }
            }

            Log::error('Paystack API error', [
                'http_code' => $httpCode,
                'response' => $response,
            ]);

            return [
                'success' => false,
                'message' => 'Failed to initialize payment. Please try again.',
            ];
        } catch (\Exception $e) {
            Log::error('Paystack initialization exception', [
                'error' => $e->getMessage(),
                'reference' => $reference,
            ]);

            return [
                'success' => false,
                'message' => 'Payment initialization failed. Please try again.',
            ];
        }
    }

    /**
     * Handle payment webhook callback.
     */
    public function handleWebhook(Request $request): array
    {
        // Get webhook secret from config
        $gateway = config('services.payment.gateway', 'paystack');
        $secret = config("services.payment.{$gateway}.webhook_secret", '');

        // Verify webhook signature
        $verified = $this->webhookService->verifySignature($request, $secret);

        if (! $verified) {
            Log::warning('Invalid webhook signature', [
                'ip' => $request->ip(),
                'headers' => $request->headers->all(),
            ]);

            return [
                'success' => false,
                'message' => 'Invalid webhook signature',
            ];
        }

        // Paystack webhook format: event.data.reference, event.data.status
        $event = $request->input('event');
        $data = $request->input('data');

        // Handle Paystack webhook format
        if ($event && $data) {
            $reference = $data['reference'] ?? null;
            $status = $data['status'] ?? null;

            // Paystack events: 'charge.success' means payment successful
            if ($event === 'charge.success' && $status === 'success' && $reference) {
                // Find transaction
                $transaction = Transaction::where('reference', $reference)->first();

                if (! $transaction) {
                    Log::warning('Transaction not found for webhook', ['reference' => $reference]);

                    return [
                        'success' => false,
                        'message' => 'Transaction not found',
                    ];
                }

                // Update transaction status
                $transaction->status = 'success';
                $transaction->vendor_response = $request->all();
                $transaction->save();

                Log::info('Payment webhook processed successfully', [
                    'reference' => $reference,
                    'transaction_id' => $transaction->id,
                ]);

                return [
                    'success' => true,
                    'message' => 'Payment confirmed, data bundle will be delivered',
                    'transaction' => $transaction,
                ];
            } elseif ($event === 'charge.failed' && isset($data['reference'])) {
                // Handle failed payment
                $transaction = Transaction::where('reference', $data['reference'])->first();

                if ($transaction) {
                    $transaction->status = 'failed';
                    $transaction->vendor_response = $request->all();
                    $transaction->save();

                    Log::info('Payment failed via webhook', [
                        'reference' => $data['reference'],
                        'transaction_id' => $transaction->id,
                    ]);
                }

                return [
                    'success' => true,
                    'message' => 'Payment failure recorded',
                    'transaction' => $transaction ?? null,
                ];
            }
        }

        // Fallback: try to extract from direct input (for testing or other formats)
        $reference = $request->input('reference') ?? $request->input('data.reference');
        $status = $request->input('status') ?? $request->input('data.status');

        if ($reference) {
            $transaction = Transaction::where('reference', $reference)->first();

            if ($transaction) {
                $transaction->status = $this->mapPaymentStatus($status);
                $transaction->vendor_response = $request->all();
                $transaction->save();

                return [
                    'success' => true,
                    'message' => 'Webhook processed',
                    'transaction' => $transaction,
                ];
            }
        }

        Log::warning('Webhook received but could not process', [
            'payload' => $request->all(),
        ]);

        return [
            'success' => false,
            'message' => 'Could not process webhook data',
        ];
    }

    /**
     * Map payment gateway status to our transaction status.
     */
    private function mapPaymentStatus(?string $gatewayStatus): string
    {
        if (! $gatewayStatus) {
            return 'pending';
        }

        $status = strtolower($gatewayStatus);

        return match (true) {
            in_array($status, ['success', 'successful', 'completed', 'paid']) => 'success',
            in_array($status, ['failed', 'error', 'declined', 'cancelled']) => 'failed',
            default => 'pending',
        };
    }
}
