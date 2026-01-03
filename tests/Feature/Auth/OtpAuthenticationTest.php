<?php

use App\Models\OtpVerification;
use App\Models\User;
use App\Services\OtpService;

beforeEach(function () {
    $this->otpService = app(OtpService::class);
});

it('can send otp to phone number', function () {
    $phone = '233244123456';

    $result = $this->otpService->sendOtp($phone);

    expect($result['success'])->toBeTrue();
    expect(OtpVerification::where('phone', $phone)->exists())->toBeTrue();
});

it('can verify otp and create user', function () {
    $phone = '233244123456';
    $this->otpService->sendOtp($phone);

    $otp = OtpVerification::where('phone', $phone)->latest()->first();

    $result = $this->otpService->verifyOtp($phone, $otp->code);

    expect($result['success'])->toBeTrue();
    expect(User::where('phone', $phone)->exists())->toBeTrue();
});

it('rejects invalid otp code', function () {
    $phone = '233244123456';
    $this->otpService->sendOtp($phone);

    $result = $this->otpService->verifyOtp($phone, '000000');

    expect($result['success'])->toBeFalse();
});
