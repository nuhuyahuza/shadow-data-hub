<?php

namespace App\Http\Controllers;

use App\Http\Requests\Wallet\FundWalletRequest;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WalletController extends Controller
{
    public function __construct(
        protected WalletService $walletService
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
        $amount = $request->validated()['amount'];
        $paymentMethod = $request->validated()['payment_method'];

        // Generate payment reference
        $reference = 'FUND-'.Str::upper(Str::random(12));

        // TODO: Integrate with payment gateway (MTN MoMo, Telecel Cash, AirtelTigo Money)
        // For now, return a placeholder response
        // In production, this would:
        // 1. Create a pending transaction
        // 2. Redirect to payment gateway
        // 3. Handle webhook callback

        return response()->json([
            'message' => 'Payment gateway integration required',
            'reference' => $reference,
            'amount' => $amount,
            'payment_method' => $paymentMethod,
            // 'payment_url' => $paymentGateway->getPaymentUrl($reference, $amount),
        ]);
    }

    /**
     * Handle payment webhook (credit wallet).
     */
    public function webhook(Request $request): JsonResponse
    {
        // TODO: Implement webhook verification and processing
        // This should:
        // 1. Verify webhook signature
        // 2. Find transaction by reference
        // 3. Credit wallet if payment successful
        // 4. Update transaction status

        $reference = $request->input('reference');
        $amount = $request->input('amount');
        $status = $request->input('status');

        if ($status === 'success' && $reference && $amount) {
            // Find user by transaction reference or payment reference
            // For now, this is a placeholder
            // $transaction = Transaction::where('reference', $reference)->first();
            // if ($transaction) {
            //     $this->walletService->credit($transaction->user, $amount, $reference);
            // }
        }

        return response()->json(['message' => 'Webhook received']);
    }
}
