<?php

namespace App\Http\Controllers;

use App\Http\Requests\Wallet\FundWalletRequest;
use App\Models\Transaction;
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
        protected WebhookService $webhookService
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

        // Create pending transaction
        $transaction = Transaction::create([
            'user_id' => $user->id,
            'reference' => $reference,
            'type' => 'funding',
            'amount' => $amount,
            'status' => 'pending',
        ]);

        // TODO: Integrate with payment gateway (MTN MoMo, Telecel Cash, AirtelTigo Money)
        // In production, this would:
        // 1. Initialize payment with gateway
        // 2. Get payment URL/authorization
        // 3. Return payment URL to frontend
        // 4. Handle webhook callback in webhook() method

        $gateway = config('services.payment.gateway');

        return response()->json([
            'message' => 'Payment gateway integration required. Configure payment gateway in config/services.php',
            'reference' => $reference,
            'amount' => $amount,
            'payment_method' => $paymentMethod,
            'gateway' => $gateway,
            'transaction_id' => $transaction->id,
            // 'payment_url' => $paymentGateway->getPaymentUrl($reference, $amount),
        ]);
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

        $reference = $request->input('reference') ?? $request->input('data.reference');
        $amount = $request->input('amount') ?? $request->input('data.amount');
        $status = $request->input('status') ?? $request->input('data.status');

        if ($status === 'success' && $reference && $amount) {
            // Find transaction by reference
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

                Log::info('Wallet credited via webhook', [
                    'transaction_id' => $transaction->id,
                    'user_id' => $transaction->user_id,
                    'amount' => $amount,
                ]);
            } else {
                Log::warning('Transaction not found for webhook', [
                    'reference' => $reference,
                ]);
            }
        }

        return response()->json(['message' => 'Webhook processed']);
    }
}
