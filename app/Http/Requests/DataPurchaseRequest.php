<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DataPurchaseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'package_id' => ['required', 'exists:data_packages,id'],
            'network' => ['required', 'string', Rule::in(['mtn', 'telecel', 'airteltigo'])],
            'phone_number' => ['required', 'string', 'regex:/^(\+?233|0)?[0-9]{9}$/'],
            'payment_method' => ['nullable', 'string', Rule::in(['direct', 'wallet', 'mtn_momo', 'telecel_cash', 'airteltigo_money'])],
            'payment_phone' => ['nullable', 'string', 'regex:/^(\+?233|0)?[0-9]{9}$/'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'package_id.required' => 'Please select a data package.',
            'package_id.exists' => 'Selected package does not exist.',
            'network.required' => 'Network is required.',
            'network.in' => 'Invalid network selected.',
            'phone_number.required' => 'Phone number is required.',
            'phone_number.regex' => 'Please enter a valid Ghana phone number.',
            'payment_method.in' => 'Invalid payment method selected.',
            'payment_phone.regex' => 'Please enter a valid Ghana phone number for payment.',
        ];
    }
}
