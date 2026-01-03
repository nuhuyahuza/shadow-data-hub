<?php

namespace App\Services;

use App\Models\OtpVerification;
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
        $expiresAt = now()->addMinutes(5);

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
     * Send SMS (placeholder - integrate with real SMS provider).
     */
    protected function sendSms(string $phone, string $code): void
    {
        // TODO: Integrate with real SMS provider (e.g., Twilio, Nexmo, etc.)
        // For now, log the OTP for development
        \Log::info("OTP for {$phone}: {$code}");

        // In production, this would call an SMS API:
        // $smsProvider->send($phone, "Your OTP code is: {$code}");
    }

    /**
     * Detect network from phone number.
     */
    public function detectNetwork(string $phone): ?string
    {
        // Remove country code if present
        $phone = preg_replace('/^\+?233/', '', $phone);
        $phone = ltrim($phone, '0');

        // MTN prefixes: 24, 54, 55, 59
        if (preg_match('/^(24|54|55|59)/', $phone)) {
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
