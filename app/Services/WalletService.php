<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

class WalletService
{
    /**
     * Recalculate wallet balances from wallet transactions to ensure consistency.
     */
    protected function recalcWallet(User $user): Wallet
    {
        $wallet = Wallet::firstOrCreate([
            'user_id' => $user->id,
        ], [
            'balance' => 0.00,
            'total_funded' => 0.00,
            'total_spent' => 0.00,
        ]);

        // Calculate totals from wallet transactions
        // Only count deductions with status='completed' (not 'refunded')
        // Count refunds and funding with status='completed'
        $totals = WalletTransaction::query()
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->selectRaw("
                SUM(CASE WHEN type = 'funding' THEN amount ELSE 0 END) AS total_funding,
                SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) AS total_refund,
                SUM(CASE WHEN type = 'deduction' THEN amount ELSE 0 END) AS total_deduction
            ")
            ->first();

        $totalFunding = (float) ($totals->total_funding ?? 0);
        $totalRefund = (float) ($totals->total_refund ?? 0);
        $totalDeduction = (float) ($totals->total_deduction ?? 0);

        // If no wallet transactions exist, fall back to Transaction records for funding (backward compatibility)
        if ($totalFunding == 0) {
            $fundingFromTransactions = Transaction::where('user_id', $user->id)
                ->where('type', 'funding')
                ->where('status', 'success')
                ->sum('amount');
            $totalFunding = (float) $fundingFromTransactions;
        }

        // Balance = funding + refunds - deductions (only completed deductions count)
        $balance = $totalFunding + $totalRefund - $totalDeduction;
        // Total spent = deductions that weren't refunded
        $totalSpent = max(0, $totalDeduction - $totalRefund);

        $wallet->update([
            'balance' => $balance,
            'total_funded' => $totalFunding,
            'total_spent' => $totalSpent,
        ]);

        return $wallet->fresh();
    }

    /**
     * Get wallet balance and stats for user.
     */
    public function getWallet(User $user): array
    {
        $wallet = $this->recalcWallet($user);

        return [
            'balance' => $wallet->balance,
            'total_funded' => $wallet->total_funded,
            'total_spent' => $wallet->total_spent,
        ];
    }

    /**
     * Deduct amount from wallet (with locking and idempotency).
     */
    public function deduct(User $user, float $amount, string $reference, array $metadata = []): bool
    {
        return DB::transaction(function () use ($user, $amount, $reference, $metadata) {
            // Check for existing transaction with same reference (idempotency)
            $existingTransaction = Transaction::where('reference', $reference)
                ->where('user_id', $user->id)
                ->where('type', 'purchase')
                ->lockForUpdate()
                ->first();

            if ($existingTransaction) {
                // If transaction already exists and is successful, return true (idempotent)
                if ($existingTransaction->status === 'success') {
                    return true;
                }

                // If transaction exists but failed, allow retry
                if ($existingTransaction->status === 'failed') {
                    // Delete failed transaction to allow retry
                    $existingTransaction->delete();
                } else {
                    // Transaction is pending, return false to indicate it's being processed
                    return false;
                }
            }

            $wallet = Wallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $wallet) {
                // Create wallet if it doesn't exist
                $wallet = Wallet::create([
                    'user_id' => $user->id,
                    'balance' => 0.00,
                    'total_funded' => 0.00,
                    'total_spent' => 0.00,
                ]);
            }

            if ($wallet->balance < $amount) {
                return false;
            }

            $wallet->balance -= $amount;
            $wallet->total_spent += $amount;
            $wallet->save();

            // Create transaction record
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'reference' => $reference,
                'type' => 'purchase',
                'amount' => $amount,
                'status' => 'pending',
                ...$metadata,
            ]);

            // Create wallet transaction record for deduction
            WalletTransaction::create([
                'user_id' => $user->id,
                'transaction_id' => $transaction->id,
                'reference' => 'WALLET-'.$reference,
                'type' => 'deduction',
                'amount' => $amount,
                'status' => 'completed',
                'original_transaction_reference' => $reference,
                'description' => 'Wallet deduction for purchase',
                'metadata' => $metadata,
            ]);

            return true;
        });
    }

    /**
     * Credit amount to wallet (with idempotency).
     */
    public function credit(User $user, float $amount, string $reference, array $metadata = []): void
    {
        DB::transaction(function () use ($user, $amount, $reference, $metadata) {
            // Check for existing transaction with same reference (idempotency)
            $existingTransaction = Transaction::where('reference', $reference)
                ->where('user_id', $user->id)
                ->where('type', 'funding')
                ->lockForUpdate()
                ->first();

            // If transaction already exists and is successful, skip (idempotent)
            if ($existingTransaction && $existingTransaction->status === 'success') {
                return;
            }

            $wallet = Wallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $wallet) {
                // Create wallet if it doesn't exist
                $wallet = Wallet::create([
                    'user_id' => $user->id,
                    'balance' => 0.00,
                    'total_funded' => 0.00,
                    'total_spent' => 0.00,
                ]);
            }

            $wallet->balance += $amount;
            $wallet->total_funded += $amount;
            $wallet->save();

            // Update existing transaction if it exists, otherwise create new one
            $transaction = null;
            if ($existingTransaction) {
                $existingTransaction->update([
                    'status' => 'success',
                    'amount' => $amount,
                    ...$metadata,
                ]);
                $transaction = $existingTransaction;
            } else {
                // Create transaction record
                $transaction = Transaction::create([
                    'user_id' => $user->id,
                    'reference' => $reference,
                    'type' => 'funding',
                    'amount' => $amount,
                    'status' => 'success',
                    ...$metadata,
                ]);
            }

            // Create wallet transaction record for funding
            WalletTransaction::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'reference' => 'WALLET-FUND-'.$reference,
                ],
                [
                    'transaction_id' => $transaction->id,
                    'type' => 'funding',
                    'amount' => $amount,
                    'status' => 'completed',
                    'original_transaction_reference' => $reference,
                    'description' => 'Wallet funding',
                    'metadata' => $metadata,
                ]
            );
        });
    }

    /**
     * Refund amount to wallet and mark original transaction as refunded.
     */
    public function refund(User $user, float $amount, string $originalReference, ?Transaction $originalTransaction = null): void
    {
        DB::transaction(function () use ($user, $amount, $originalReference, $originalTransaction) {
            // Find original transaction if not provided
            if (! $originalTransaction) {
                $originalTransaction = Transaction::where('reference', $originalReference)
                    ->where('user_id', $user->id)
                    ->where('type', 'purchase')
                    ->first();
            }

            if (! $originalTransaction) {
                throw new \Exception('Original transaction not found');
            }

            // Check if already refunded
            $existingRefund = WalletTransaction::where('original_transaction_reference', $originalReference)
                ->where('type', 'refund')
                ->where('status', 'completed')
                ->first();

            if ($existingRefund) {
                throw new \Exception('Transaction already refunded');
            }

            $wallet = Wallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $wallet) {
                // Create wallet if it doesn't exist
                $wallet = Wallet::create([
                    'user_id' => $user->id,
                    'balance' => 0.00,
                    'total_funded' => 0.00,
                    'total_spent' => 0.00,
                ]);
            }

            // Refund the amount
            $wallet->balance += $amount;
            $wallet->total_spent -= $amount;
            $wallet->save();

            // Update original transaction status to refunded
            $originalTransaction->update([
                'status' => 'refunded',
                'vendor_response' => array_merge(
                    $originalTransaction->vendor_response ?? [],
                    [
                        'refunded_at' => now()->toIso8601String(),
                        'refund_amount' => $amount,
                    ]
                ),
            ]);

            // Create wallet transaction record for refund
            WalletTransaction::create([
                'user_id' => $user->id,
                'transaction_id' => $originalTransaction->id,
                'reference' => 'REFUND-'.substr($originalReference, -12),
                'type' => 'refund',
                'amount' => $amount,
                'status' => 'completed',
                'original_transaction_reference' => $originalReference,
                'description' => 'Refund for failed transaction',
                'metadata' => [
                    'original_transaction_id' => $originalTransaction->id,
                    'refunded_at' => now()->toIso8601String(),
                ],
            ]);

            // Find and update the original deduction wallet transaction
            $deductionTransaction = WalletTransaction::where('original_transaction_reference', $originalReference)
                ->where('type', 'deduction')
                ->first();

            if ($deductionTransaction) {
                $deductionTransaction->update([
                    'status' => 'refunded',
                ]);
            }

            // Recalculate wallet to ensure accurate balance after refund
            $this->recalcWallet($user);
        });
    }
}
