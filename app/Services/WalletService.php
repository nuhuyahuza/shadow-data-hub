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
     * Deduct amount from wallet (with locking).
     */
    public function deduct(User $user, float $amount, string $reference, array $metadata = []): bool
    {
        return DB::transaction(function () use ($user, $amount, $reference, $metadata) {
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
     * Credit amount to wallet.
     */
    public function credit(User $user, float $amount, string $reference, array $metadata = []): void
    {
        DB::transaction(function () use ($user, $amount, $reference, $metadata) {
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

            // Create transaction record
            Transaction::create([
                'user_id' => $user->id,
                'reference' => $reference,
                'type' => 'funding',
                'amount' => $amount,
                'status' => 'success',
                ...$metadata,
            ]);
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
