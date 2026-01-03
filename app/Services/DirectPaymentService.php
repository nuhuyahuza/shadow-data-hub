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

        // TODO: Integrate with actual payment gateway (MTN MoMo, Telecel Cash, AirtelTigo Money)
        // This is a placeholder implementation
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

        // In production, this would:
        // 1. Initialize payment with gateway API
        // 2. Get payment URL/authorization
        // 3. Return payment URL to frontend
        // Example:
        // $paymentGateway = app(PaymentGatewayInterface::class);
        // $paymentUrl = $paymentGateway->initiatePayment([
        //     'amount' => $amount,
        //     'phone' => $phone,
        //     'reference' => $reference,
        //     'callback_url' => route('guest.payment.webhook'),
        // ]);

        Log::info('Direct payment initiated', [
            'reference' => $reference,
            'amount' => $amount,
            'phone' => $phone,
            'gateway' => $gateway,
        ]);

        return [
            'success' => true,
            'reference' => $reference,
            'transaction_id' => $transaction->id,
            'payment_url' => null, // Will be set when gateway is integrated
            'message' => 'Payment gateway integration required. Configure payment gateway.',
        ];
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

        // Extract payment reference from webhook payload
        $reference = $request->input('reference') ?? $request->input('transaction_reference');
        $status = $request->input('status');
        $amount = $request->input('amount');

        if (! $reference) {
            return [
                'success' => false,
                'message' => 'Payment reference not found',
            ];
        }

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
        $transaction->status = $this->mapPaymentStatus($status);
        $transaction->vendor_response = $request->all();
        $transaction->save();

        // If payment successful, auto-deliver data bundle
        if ($transaction->status === 'success' && $transaction->type === 'purchase') {
            // Trigger data bundle delivery via VendorService
            // This will be handled by the GuestPurchaseController
            return [
                'success' => true,
                'message' => 'Payment confirmed, data bundle will be delivered',
                'transaction' => $transaction,
            ];
        }

        return [
            'success' => true,
            'message' => 'Webhook processed',
            'transaction' => $transaction,
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
