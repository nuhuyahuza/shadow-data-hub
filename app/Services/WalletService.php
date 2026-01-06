<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class WalletService
{
    /**
     * Get wallet balance and stats for user.
     */
    public function getWallet(User $user): array
    {
        $wallet = $user->wallet;

        if (! $wallet) {
            // Create wallet if it doesn't exist
            $wallet = Wallet::create([
                'user_id' => $user->id,
                'balance' => 0.00,
                'total_funded' => 0.00,
                'total_spent' => 0.00,
            ]);
        }

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
                throw new \Exception('Wallet not found');
            }

            if ($wallet->balance < $amount) {
                return false;
            }

            $wallet->balance -= $amount;
            $wallet->total_spent += $amount;
            $wallet->save();

            // Create transaction record
            Transaction::create([
                'user_id' => $user->id,
                'reference' => $reference,
                'type' => 'purchase',
                'amount' => $amount,
                'status' => 'pending',
                ...$metadata,
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
            if ($existingTransaction) {
                $existingTransaction->update([
                    'status' => 'success',
                    'amount' => $amount,
                    ...$metadata,
                ]);
            } else {
                // Create transaction record
                Transaction::create([
                    'user_id' => $user->id,
                    'reference' => $reference,
                    'type' => 'funding',
                    'amount' => $amount,
                    'status' => 'success',
                    ...$metadata,
                ]);
            }
        });
    }

    /**
     * Refund amount to wallet.
     */
    public function refund(User $user, float $amount, string $originalReference): void
    {
        DB::transaction(function () use ($user, $amount, $originalReference) {
            $wallet = Wallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $wallet) {
                return;
            }

            $wallet->balance += $amount;
            $wallet->total_spent -= $amount;
            $wallet->save();

            // Create refund transaction record
            Transaction::create([
                'user_id' => $user->id,
                'reference' => 'REFUND-'.substr($originalReference, -8),
                'type' => 'funding',
                'amount' => $amount,
                'status' => 'success',
            ]);
        });
    }
}
