<?php

namespace App\Services;

use App\Models\OtpVerification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class OtpService
{
    /**
     * Generate and send OTP to phone number.
     */
    public function sendOtp(string $phone): array
    {
        // Rate limiting: max 3 requests per 5 minutes per phone
        $key = 'otp_send:'.$phone;
        if (RateLimiter::tooManyAttempts($key, 3)) {
            return [
                'success' => false,
                'message' => 'Too many OTP requests. Please try again later.',
            ];
        }

        // Rate limiting: max 10 requests per hour per IP
        $ipKey = 'otp_send_ip:'.request()->ip();
        if (RateLimiter::tooManyAttempts($ipKey, 10)) {
            return [
                'success' => false,
                'message' => 'Too many requests from this IP. Please try again later.',
            ];
        }

        // Generate 6-digit OTP
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Expire after 5 minutes
        $expiresAt = now()->addMinutes(2);

        // Delete any existing unverified OTPs for this phone
        OtpVerification::where('phone', $phone)
            ->whereNull('verified_at')
            ->delete();

        // Create new OTP record
        $otp = OtpVerification::create([
            'phone' => $phone,
            'code' => $code,
            'expires_at' => $expiresAt,
            'attempts' => 0,
        ]);

        // Send OTP via SMS (placeholder - integrate with real SMS provider)
        $this->sendSms($phone, $code);

        // Increment rate limiters
        RateLimiter::hit($key, 300); // 5 minutes
        RateLimiter::hit($ipKey, 3600); // 1 hour

        return [
            'success' => true,
            'message' => 'OTP sent successfully',
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Verify OTP code.
     */
    public function verifyOtp(string $phone, string $code): array
    {
        $otp = OtpVerification::where('phone', $phone)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (! $otp) {
            return [
                'success' => false,
                'message' => 'No OTP found for this phone number.',
            ];
        }

        // Check if expired
        if ($otp->isExpired()) {
            return [
                'success' => false,
                'message' => 'OTP has expired. Please request a new one.',
            ];
        }

        // Check attempts (max 5 attempts)
        if ($otp->attempts >= 5) {
            return [
                'success' => false,
                'message' => 'Too many verification attempts. Please request a new OTP.',
            ];
        }

        // Increment attempts
        $otp->incrementAttempts();

        // Verify code
        if ($otp->code !== $code) {
            return [
                'success' => false,
                'message' => 'Invalid OTP code.',
            ];
        }

        // Mark as verified
        $otp->markAsVerified();

        return [
            'success' => true,
            'message' => 'OTP verified successfully',
        ];
    }

    /**
     * Send SMS via configured provider.
     */
    protected function sendSms(string $phone, string $code): void
    {
        $provider = config('services.sms.provider', 'twilio');
        $message = "Your OTP code is: {$code}. Valid for 5 minutes.";

        try {
            match ($provider) {
                'twilio' => $this->sendViaTwilio($phone, $message),
                'nexmo' => $this->sendViaNexmo($phone, $message),
                'termii' => $this->sendViaTermii($phone, $message),
                default => $this->sendViaLog($phone, $code),
            };
        } catch (\Exception $e) {
            Log::error('SMS sending failed', [
                'provider' => $provider,
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);
            // Fallback to logging in development
            $this->sendViaLog($phone, $code);
        }
    }

    /**
     * Send SMS via Twilio.
     */
    protected function sendViaTwilio(string $phone, string $message): void
    {
        $config = config('services.sms.twilio');
        if (! $config['account_sid'] || ! $config['auth_token']) {
            throw new \Exception('Twilio credentials not configured');
        }

        // TODO: Implement Twilio SDK integration
        // Example:
        // $client = new \Twilio\Rest\Client($config['account_sid'], $config['auth_token']);
        // $client->messages->create($phone, [
        //     'from' => $config['from'],
        //     'body' => $message,
        // ]);

        Log::info("Twilio SMS would be sent to {$phone}: {$message}");
    }

    /**
     * Send SMS via Nexmo/Vonage.
     */
    protected function sendViaNexmo(string $phone, string $message): void
    {
        $config = config('services.sms.nexmo');
        if (! $config['api_key'] || ! $config['api_secret']) {
            throw new \Exception('Nexmo credentials not configured');
        }

        // TODO: Implement Nexmo SDK integration
        Log::info("Nexmo SMS would be sent to {$phone}: {$message}");
    }

    /**
     * Send SMS via Termii.
     */
    protected function sendViaTermii(string $phone, string $message): void
    {
        $config = config('services.sms.termii');
        if (! $config['api_key']) {
            throw new \Exception('Termii credentials not configured');
        }

        // TODO: Implement Termii API integration
        Log::info("Termii SMS would be sent to {$phone}: {$message}");
    }

    /**
     * Fallback: Log OTP for development.
     */
    protected function sendViaLog(string $phone, string $code): void
    {
        Log::info("OTP for {$phone}: {$code} (Development mode - SMS not configured)");
    }

    /**
     * Detect network from phone number.
     */
    public function detectNetwork(string $phone): ?string
    {
        // Remove country code if present
        $phone = preg_replace('/^\+?233/', '', $phone);
        $phone = ltrim($phone, '0');

        // MTN prefixes: 24, 54, 55, 59, 53 (after removing leading 0: 024->24, 053->53, 054->54, 055->55, 059->59)
        if (preg_match('/^(24|54|55|59|53)/', $phone)) {
            return 'mtn';
        }

        // Telecel (Vodafone) prefixes: 20, 50
        if (preg_match('/^(20|50)/', $phone)) {
            return 'telecel';
        }

        // AirtelTigo prefixes: 26, 56, 57
        if (preg_match('/^(26|56|57)/', $phone)) {
            return 'airteltigo';
        }

        return null;
    }

    /**
     * Format phone number for storage (233XXXXXXXXX).
     */
    public function formatPhone(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/\D/', '', $phone);

        // Remove leading 0 if present
        $phone = ltrim($phone, '0');

        // Add country code if not present
        if (! str_starts_with($phone, '233')) {
            $phone = '233'.$phone;
        }

        return $phone;
    }

    /**
     * Format phone number for display (+233 XX XXX XXXX).
     */
    public function formatPhoneForDisplay(string $phone): string
    {
        $phone = $this->formatPhone($phone);
        $phone = ltrim($phone, '233');

        return '+233 '.substr($phone, 0, 2).' '.substr($phone, 2, 3).' '.substr($phone, 5);
    }
}
