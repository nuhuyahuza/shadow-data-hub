<?php

namespace App\Http\Controllers;

use App\Http\Requests\Wallet\FundWalletRequest;
use App\Models\Transaction;
use App\Services\DirectPaymentService;
use App\Services\WalletService;
use App\Services\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class WalletController extends Controller
{
    public function __construct(
        protected WalletService $walletService,
        protected WebhookService $webhookService,
        protected DirectPaymentService $directPaymentService
    ) {}

    /**
     * Get wallet balance and stats.
     */
    public function index(Request $request): JsonResponse
    {
        $wallet = $this->walletService->getWallet($request->user());

        return response()->json($wallet);
    }

    /**
     * Initiate wallet funding.
     */
    public function fund(FundWalletRequest $request): JsonResponse
    {
        $user = $request->user();
        $amount = $request->validated()['amount'];
        $paymentMethod = $request->validated()['payment_method'];

        // Generate payment reference
        $reference = 'FUND-'.Str::upper(Str::random(12));

        // Get user email or use phone as identifier
        $email = $user->email ?? $user->phone.'@datahub.gh';

        // Create pending transaction
        $transaction = Transaction::create([
            'user_id' => $user->id,
            'reference' => $reference,
            'type' => 'funding',
            'amount' => $amount,
            'status' => 'pending',
            'payment_method' => $paymentMethod,
        ]);

        // Initialize payment with Paystack
        $gateway = config('services.payment.gateway', 'paystack');
        $secretKey = config("services.payment.{$gateway}.secret_key", '');
        $publicKey = config("services.payment.{$gateway}.public_key", '');

        if (! $secretKey || ! $publicKey) {
            $transaction->update(['status' => 'failed']);

            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not configured',
            ], 422);
        }

        // Determine if this is mobile money payment
        $isMobileMoney = in_array($paymentMethod, ['mtn_momo', 'telecel_cash', 'airteltigo_money']);
        $phone = $user->phone ?? $email;

        if ($isMobileMoney) {
            // Use Paystack Mobile Money Charge API
            $result = $this->initiateMobileMoneyCharge(
                $transaction,
                $phone,
                $amount,
                $reference,
                $secretKey,
                $publicKey
            );

            if (! $result['success']) {
                $transaction->update(['status' => 'failed']);

                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Failed to initialize payment',
                ], 422);
            }

            return response()->json([
                'success' => true,
                'reference' => $reference,
                'transaction_id' => $transaction->id,
                'payment_method' => 'mobile_money',
                'display' => $result['display'] ?? null,
                'public_key' => $publicKey,
                'message' => $result['message'] ?? 'Payment initialized successfully',
            ]);
        }

        // Use standard Paystack transaction initialization for card payments
        $paystackUrl = 'https://api.paystack.co/transaction/initialize';
        $appUrl = config('app.url');
        $callbackUrl = (str_contains($appUrl, 'localhost') || str_contains($appUrl, '127.0.0.1'))
            ? null
            : $appUrl.'/payment/success';

        $paystackData = [
            'email' => $email,
            'amount' => $amount * 100, // Convert to pesewas
            'currency' => 'GHS',
            'reference' => $reference,
            'metadata' => [
                'transaction_id' => $transaction->id,
                'type' => 'wallet_funding',
            ],
        ];

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

                    Log::info('Paystack wallet funding initialized', [
                        'reference' => $reference,
                        'authorization_url' => $authorizationUrl,
                    ]);

                    return response()->json([
                        'success' => true,
                        'reference' => $reference,
                        'transaction_id' => $transaction->id,
                        'payment_url' => $authorizationUrl,
                        'public_key' => $publicKey,
                        'payment_method' => 'card',
                        'message' => 'Payment ready. Please complete payment.',
                    ]);
                }
            }

            Log::error('Paystack API error for wallet funding', [
                'http_code' => $httpCode,
                'response' => $response,
            ]);

            $transaction->update(['status' => 'failed']);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initialize payment. Please try again.',
            ], 422);
        } catch (\Exception $e) {
            Log::error('Paystack initialization exception for wallet funding', [
                'error' => $e->getMessage(),
                'reference' => $reference,
            ]);

            $transaction->update(['status' => 'failed']);

            return response()->json([
                'success' => false,
                'message' => 'Payment initialization failed. Please try again.',
            ], 422);
        }
    }

    /**
     * Handle payment webhook (credit wallet).
     */
    public function webhook(Request $request): JsonResponse
    {
        // Rate limit webhook endpoint
        $key = 'webhook:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 60)) {
            Log::warning('Webhook rate limit exceeded', ['ip' => $request->ip()]);

            return response()->json(['message' => 'Too many requests'], 429);
        }
        RateLimiter::hit($key, 60); // 60 requests per minute

        // Verify webhook signature
        $gateway = config('services.payment.gateway');
        $secret = config("services.payment.{$gateway}.webhook_secret");

        if ($secret && ! $this->webhookService->verifySignature($request, $secret)) {
            Log::warning('Invalid webhook signature', [
                'ip' => $request->ip(),
                'gateway' => $gateway,
            ]);

            return response()->json(['message' => 'Invalid signature'], 401);
        }

        // Optional: IP whitelist check (uncomment if needed)
        // $whitelist = $this->webhookService->getGatewayIpWhitelist($gateway);
        // if (!empty($whitelist) && !$this->webhookService->isIpWhitelisted($request, $whitelist)) {
        //     Log::warning('Webhook from non-whitelisted IP', ['ip' => $request->ip()]);
        //     return response()->json(['message' => 'Unauthorized IP'], 403);
        // }

        // Log webhook attempt
        Log::info('Webhook received', [
            'gateway' => $gateway,
            'payload' => $request->all(),
        ]);

        // Handle Paystack webhook format: event.data structure
        $event = $request->input('event');
        $data = $request->input('data');

        if ($event && $data) {
            // Paystack webhook format
            $reference = $data['reference'] ?? null;
            $amount = isset($data['amount']) ? ($data['amount'] / 100) : null; // Convert from pesewas
            $status = $data['status'] ?? null;
            $paystackTransactionId = $data['id'] ?? null;

            // Handle charge.success event for wallet funding
            if ($event === 'charge.success' && $status === 'success' && $reference && $amount) {
                // Find transaction by reference (idempotency check)
                $transaction = Transaction::where('reference', $reference)
                    ->where('type', 'funding')
                    ->first();

                if ($transaction) {
                    // Only credit if transaction is still pending (idempotency)
                    if ($transaction->status === 'pending') {
                        $this->walletService->credit(
                            $transaction->user,
                            (float) $amount,
                            $reference
                        );
                    }

                    // Update transaction status and store Paystack transaction ID
                    $transaction->update([
                        'status' => 'success',
                        'vendor_reference' => $paystackTransactionId ? (string) $paystackTransactionId : $transaction->vendor_reference,
                        'vendor_response' => $request->all(),
                    ]);

                    Log::info('Wallet credited via webhook', [
                        'transaction_id' => $transaction->id,
                        'user_id' => $transaction->user_id,
                        'amount' => $amount,
                        'reference' => $reference,
                    ]);
                } else {
                    Log::warning('Transaction not found for webhook', [
                        'reference' => $reference,
                    ]);
                }
            } elseif ($event === 'charge.failed' && isset($data['reference'])) {
                // Handle failed payment
                $transaction = Transaction::where('reference', $data['reference'])
                    ->where('type', 'funding')
                    ->first();

                if ($transaction && $transaction->status === 'pending') {
                    $transaction->update([
                        'status' => 'failed',
                        'vendor_response' => $request->all(),
                    ]);

                    Log::info('Wallet funding failed via webhook', [
                        'transaction_id' => $transaction->id,
                        'reference' => $data['reference'],
                    ]);
                }
            }
        } else {
            // Fallback: try to extract from direct input (for testing or other formats)
            $reference = $request->input('reference') ?? $request->input('data.reference');
            $amount = $request->input('amount') ?? ($request->input('data.amount') ? ($request->input('data.amount') / 100) : null);
            $status = $request->input('status') ?? $request->input('data.status');

            if ($status === 'success' && $reference && $amount) {
                $transaction = Transaction::where('reference', $reference)
                    ->where('type', 'funding')
                    ->where('status', 'pending')
                    ->first();

                if ($transaction) {
                    $this->walletService->credit(
                        $transaction->user,
                        (float) $amount,
                        $reference
                    );

                    $transaction->update([
                        'status' => 'success',
                        'vendor_response' => $request->all(),
                    ]);

                    Log::info('Wallet credited via webhook (fallback)', [
                        'transaction_id' => $transaction->id,
                        'user_id' => $transaction->user_id,
                        'amount' => $amount,
                    ]);
                }
            }
        }

        return response()->json(['message' => 'Webhook processed']);
    }

    /**
     * Check transaction status and verify with Paystack if pending.
     */
    public function checkStatus(Request $request, string $reference): JsonResponse
    {
        $user = $request->user();

        $transaction = Transaction::where('reference', $reference)
            ->where('user_id', $user->id)
            ->where('type', 'funding')
            ->first();

        if (! $transaction) {
            return response()->json([
                'success' => false,
                'status' => 'not_found',
                'message' => 'Transaction not found',
            ], 404);
        }

        // If already successful, return immediately with wallet balance
        if ($transaction->status === 'success') {
            $wallet = $this->walletService->getWallet($user);

            return response()->json([
                'success' => true,
                'status' => 'success',
                'reference' => $reference,
                'message' => 'Payment confirmed',
                'wallet' => $wallet,
            ]);
        }

        // If pending, verify with Paystack
        if ($transaction->status === 'pending') {
            $verificationResult = null;

            // For mobile money payments, use requery if we have Paystack transaction ID
            if ($transaction->vendor_reference && in_array($transaction->payment_method, ['mtn_momo', 'telecel_cash', 'airteltigo_money'])) {
                $verificationResult = $this->directPaymentService->requeryTransaction($transaction->vendor_reference);
            } else {
                // For card payments or if no vendor_reference, use verify by reference
                $verificationResult = $this->directPaymentService->verifyTransaction($reference);
            }

            if ($verificationResult['success']) {
                $paystackStatus = $verificationResult['status'];

                if ($paystackStatus === 'success') {
                    // Credit wallet if not already credited
                    if ($transaction->status === 'pending') {
                        $this->walletService->credit(
                            $user,
                            (float) $transaction->amount,
                            $reference
                        );
                    }

                    // Update transaction status
                    $transaction->update([
                        'status' => 'success',
                        'vendor_response' => array_merge(
                            $transaction->vendor_response ?? [],
                            ['verification' => $verificationResult['data']]
                        ),
                    ]);

                    $wallet = $this->walletService->getWallet($user);

                    Log::info('Wallet funding verified and credited', [
                        'transaction_id' => $transaction->id,
                        'user_id' => $user->id,
                        'reference' => $reference,
                    ]);

                    return response()->json([
                        'success' => true,
                        'status' => 'success',
                        'reference' => $reference,
                        'message' => 'Payment confirmed and wallet credited',
                        'wallet' => $wallet,
                    ]);
                } elseif ($paystackStatus === 'failed') {
                    $transaction->update([
                        'status' => 'failed',
                        'vendor_response' => array_merge(
                            $transaction->vendor_response ?? [],
                            ['verification' => $verificationResult['data']]
                        ),
                    ]);

                    return response()->json([
                        'success' => false,
                        'status' => 'failed',
                        'reference' => $reference,
                        'message' => 'Payment failed',
                    ]);
                }
            }

            // Still pending
            return response()->json([
                'success' => true,
                'status' => 'pending',
                'reference' => $reference,
                'message' => 'Payment is still being processed',
            ]);
        }

        // Transaction failed
        return response()->json([
            'success' => false,
            'status' => $transaction->status,
            'reference' => $reference,
            'message' => 'Transaction failed',
        ]);
    }

    /**
     * Initiate Paystack Mobile Money charge for wallet funding.
     */
    private function initiateMobileMoneyCharge(
        Transaction $transaction,
        string $phone,
        float $amount,
        string $reference,
        string $secretKey,
        string $publicKey
    ): array {
        // Map payment method to Paystack provider
        $providerMap = [
            'mtn_momo' => 'MTN',
            'telecel_cash' => 'VODAFONE',
            'airteltigo_money' => 'AIRTELTIGO',
        ];

        $paymentMethod = $transaction->payment_method ?? 'mtn_momo';
        $provider = $providerMap[$paymentMethod] ?? 'MTN';

        // Format phone number (remove leading 0, add country code if needed)
        $formattedPhone = preg_replace('/^0/', '233', preg_replace('/\D/', '', $phone));

        // Check if we're in development/test mode
        $isDevelopment = in_array(config('app.env'), ['local', 'development', 'testing']);

        // In development mode, Paystack requires test mobile money numbers
        // Paystack test numbers (with country code 233):
        // MTN: 0551234987 -> 233551234987
        // VODAFONE: 0201234567 -> 233201234567
        // AIRTELTIGO: 0261234567 -> 233261234567
        if ($isDevelopment) {
            $testNumbers = [
                'MTN' => '233551234987', // Paystack test number for MTN
                'VODAFONE' => '233201234567', // Paystack test number for VODAFONE
                'AIRTELTIGO' => '233261234567', // Paystack test number for AIRTELTIGO
            ];

            // Always use test number in development mode
            $originalPhone = $formattedPhone;
            $formattedPhone = $testNumbers[$provider] ?? $testNumbers['MTN'];

            Log::info('Using Paystack test mobile money number for development', [
                'app_env' => config('app.env'),
                'is_development' => $isDevelopment,
                'original_phone' => $phone,
                'formatted_original' => $originalPhone,
                'test_phone' => $formattedPhone,
                'provider' => $provider,
            ]);
        }

        // Use Paystack charge endpoint - same format as DirectPaymentService
        $paystackUrl = 'https://api.paystack.co/charge';
        $paystackData = [
            'email' => $phone.'@datahub.gh',
            'amount' => $amount * 100, // Convert to pesewas
            'currency' => 'GHS',
            'mobile_money' => [
                'phone' => $formattedPhone,
                'provider' => $provider,
            ],
            'reference' => $reference,
            'metadata' => [
                'transaction_id' => $transaction->id,
                'type' => 'wallet_funding',
            ],
        ];

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

                if ($responseData['status'] && isset($responseData['data'])) {
                    $chargeData = $responseData['data'];
                    $paystackTransactionId = $chargeData['transaction'] ?? $chargeData['id'] ?? null;
                    $displayData = $chargeData['display'] ?? [];

                    // Store Paystack transaction ID in vendor_reference field
                    if ($paystackTransactionId) {
                        $transaction->update([
                            'vendor_reference' => (string) $paystackTransactionId,
                        ]);
                    }

                    Log::info('Paystack mobile money charge initiated for wallet funding', [
                        'reference' => $reference,
                        'paystack_transaction_id' => $paystackTransactionId,
                        'provider' => $provider,
                    ]);

                    return [
                        'success' => true,
                        'display' => $displayData,
                        'message' => $displayData['message'] ?? 'Please complete the payment on your mobile device.',
                    ];
                } elseif (isset($responseData['data']) && isset($responseData['data']['message'])) {
                    // Paystack returned an error with detailed message in data
                    $errorMessage = $responseData['data']['message'];
                    $errorStatus = $responseData['data']['status'] ?? 'failed';

                    Log::error('Paystack mobile money charge failed', [
                        'reference' => $reference,
                        'message' => $errorMessage,
                        'status' => $errorStatus,
                        'response' => $responseData,
                    ]);

                    return [
                        'success' => false,
                        'message' => $errorMessage,
                    ];
                } elseif (isset($responseData['message'])) {
                    // Paystack returned a general error message
                    Log::error('Paystack mobile money charge failed', [
                        'reference' => $reference,
                        'message' => $responseData['message'],
                        'response' => $responseData,
                    ]);

                    return [
                        'success' => false,
                        'message' => $responseData['message'] ?? 'Failed to initiate mobile money payment.',
                    ];
                }
            }

            // Parse error response from Paystack
            $errorMessage = 'Failed to initiate mobile money payment. Please try again.';
            if ($response) {
                $errorData = json_decode($response, true);
                // Check for detailed error message in data.message first
                if (isset($errorData['data']['message'])) {
                    $errorMessage = $errorData['data']['message'];
                } elseif (isset($errorData['message'])) {
                    $errorMessage = $errorData['message'];
                }
            }

            Log::error('Paystack mobile money charge error for wallet funding', [
                'http_code' => $httpCode,
                'response' => $response,
                'reference' => $reference,
                'provider' => $provider,
            ]);

            return [
                'success' => false,
                'message' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('Paystack mobile money charge exception for wallet funding', [
                'error' => $e->getMessage(),
                'reference' => $reference,
            ]);

            return [
                'success' => false,
                'message' => 'Payment initialization failed. Please try again.',
            ];
        }
    }
}
