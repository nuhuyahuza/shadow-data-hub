<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CleanupExpiredOtps extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'otp:cleanup {--days=7 : Number of days to keep expired OTPs}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired and old OTP verification records';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoffDate = now()->subDays($days);

        $deleted = \App\Models\OtpVerification::where(function ($query) use ($cutoffDate) {
            $query->whereNotNull('verified_at')
                ->orWhere('expires_at', '<', $cutoffDate);
        })->delete();

        $this->info("Cleaned up {$deleted} expired OTP records.");

        return Command::SUCCESS;
    }
}
