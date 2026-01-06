<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AdminLoginController extends Controller
{
    /**
     * Handle admin login with email/username and password.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = strtolower(trim($request->email));

        // Rate limiting: 5 attempts per minute per email
        $key = 'admin-login:'.$email;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Please try again in {$seconds} seconds."],
            ]);
        }

        // Find user by email
        $user = User::where('email', $email)->first();

        // Check if user exists and is admin
        if (! $user || ! $user->isAdmin()) {
            RateLimiter::hit($key);
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials or insufficient permissions.'],
            ]);
        }

        // Check if user has a password set
        if (! $user->password) {
            throw ValidationException::withMessages([
                'email' => ['Password not set. Please contact system administrator.'],
            ]);
        }

        // Verify password
        if (! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key);
            throw ValidationException::withMessages([
                'password' => ['Invalid credentials.'],
            ]);
        }

        // Check if 2FA is enabled for this user
        if ($user->hasEnabledTwoFactorAuthentication()) {
            // Store login attempt in session for 2FA challenge
            $request->session()->put([
                'login.id' => $user->id,
                'login.remember' => $request->boolean('remember', false),
            ]);

            // Clear rate limiter temporarily (will be cleared after 2FA)
            RateLimiter::clear($key);

            return response()->json([
                'message' => 'Two-factor authentication required',
                'two_factor' => true,
                'redirect' => route('admin.two-factor.challenge'),
            ]);
        }

        // Clear rate limiter on success
        RateLimiter::clear($key);

        // Log user in
        Auth::login($user, $request->boolean('remember', false));

        // Regenerate session to prevent session fixation
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful',
            'user' => $user->load('wallet'),
            'redirect' => route('admin.dashboard'),
        ]);
    }

    /**
     * Handle two-factor authentication challenge.
     */
    public function twoFactorChallenge(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $userId = $request->session()->get('login.id');

        if (! $userId) {
            throw ValidationException::withMessages([
                'code' => ['Session expired. Please login again.'],
            ]);
        }

        $user = User::findOrFail($userId);

        if (! $user->isAdmin()) {
            $request->session()->forget(['login.id', 'login.remember']);
            throw ValidationException::withMessages([
                'code' => ['Unauthorized access.'],
            ]);
        }

        // Rate limiting for 2FA
        $key = 'admin-2fa:'.$user->id;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'code' => ["Too many attempts. Please try again in {$seconds} seconds."],
            ]);
        }

        // Verify 2FA code or recovery code using Fortify methods
        if ($request->filled('code')) {
            // Use Fortify's two-factor authentication verification
            if (! $user->confirmTwoFactorAuth($request->code)) {
                RateLimiter::hit($key);
                throw ValidationException::withMessages([
                    'code' => ['Invalid two-factor authentication code.'],
                ]);
            }
        } elseif ($request->filled('recovery_code')) {
            // Get recovery codes and verify
            $recoveryCodes = $user->recoveryCodes();
            if (! in_array($request->recovery_code, $recoveryCodes)) {
                RateLimiter::hit($key);
                throw ValidationException::withMessages([
                    'recovery_code' => ['Invalid recovery code.'],
                ]);
            }

            // Remove used recovery code
            $user->replaceRecoveryCode($request->recovery_code);
        } else {
            throw ValidationException::withMessages([
                'code' => ['Please provide a two-factor authentication code or recovery code.'],
            ]);
        }

        // Clear rate limiter
        RateLimiter::clear($key);

        // Log user in
        $remember = $request->session()->get('login.remember', false);
        Auth::login($user, $remember);

        // Clear login session data
        $request->session()->forget(['login.id', 'login.remember']);

        // Regenerate session to prevent session fixation
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Two-factor authentication successful',
            'user' => $user->load('wallet'),
            'redirect' => route('admin.dashboard'),
        ]);
    }
}
