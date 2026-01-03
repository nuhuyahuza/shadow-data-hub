<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class GuestAccountService
{
    /**
     * Create or get guest account by phone number.
     * Auto-creates user and wallet if they don't exist.
     */
    public function createOrGetGuestAccount(string $phone): User
    {
        $formattedPhone = $this->formatPhone($phone);

        return DB::transaction(function () use ($formattedPhone) {
            // Find or create user
            $user = User::firstOrCreate(
                ['phone' => $formattedPhone],
                [
                    'name' => 'Guest '.substr($formattedPhone, -4),
                    'role' => 'user',
                ]
            );

            // Create wallet if doesn't exist
            $user->wallet()->firstOrCreate(
                ['user_id' => $user->id],
                [
                    'balance' => 0.00,
                    'total_funded' => 0.00,
                    'total_spent' => 0.00,
                ]
            );

            return $user->fresh(['wallet']);
        });
    }

    /**
     * Format phone number to standard format (+233XXXXXXXXX).
     */
    private function formatPhone(string $phone): string
    {
        // Remove all non-numeric characters
        $cleaned = preg_replace('/\D/', '', $phone);

        // Remove leading 0 if present
        if (str_starts_with($cleaned, '0')) {
            $cleaned = substr($cleaned, 1);
        }

        // Add country code if not present
        if (! str_starts_with($cleaned, '233')) {
            $cleaned = '233'.$cleaned;
        }

        return $cleaned;
    }
}
