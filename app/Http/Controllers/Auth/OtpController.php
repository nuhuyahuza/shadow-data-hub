<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OtpController extends Controller
{
    public function __construct(
        protected OtpService $otpService
    ) {}

    /**
     * Send OTP to phone number.
     */
    public function send(SendOtpRequest $request): JsonResponse
    {
        $phone = $this->otpService->formatPhone($request->validated()['phone']);

        $result = $this->otpService->sendOtp($phone);

        if (! $result['success']) {
            return response()->json($result, 429);
        }

        return response()->json([
            'message' => $result['message'],
            'expires_at' => $result['expires_at'],
            'network' => $this->otpService->detectNetwork($phone),
        ]);
    }

    /**
     * Verify OTP and login/register user.
     */
    public function verify(VerifyOtpRequest $request): JsonResponse
    {
        $phone = $this->otpService->formatPhone($request->validated()['phone']);
        $code = $request->validated()['code'];

        $result = $this->otpService->verifyOtp($phone, $code);

        if (! $result['success']) {
            return response()->json($result, 422);
        }

        // Find or create user
        $user = User::where('phone', $phone)->first();

        if (! $user) {
            // Create new user
            DB::transaction(function () use ($phone, &$user) {
                $user = User::create([
                    'phone' => $phone,
                    'name' => 'User '.substr($phone, -4), // Temporary name
                    'role' => 'user',
                ]);

                // Create wallet with 0.00 balance
                Wallet::create([
                    'user_id' => $user->id,
                    'balance' => 0.00,
                    'total_funded' => 0.00,
                    'total_spent' => 0.00,
                ]);
            });

            // Reload user with wallet
            $user->load('wallet');
        }

        // Block admin and agent login via OTP - they must use password login
        if ($user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Admin accounts require password authentication. Please use the admin login page.',
            ], 403);
        }

        if ($user->isAgent()) {
            return response()->json([
                'success' => false,
                'message' => 'Agent accounts require password authentication. Please use the agent login page.',
            ], 403);
        }

        // Log user in and remember session
        Auth::login($user, true); // true = remember the user

        // Regenerate session to prevent session fixation
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Authentication successful',
            'user' => $user->load('wallet'),
        ]);
    }
}
