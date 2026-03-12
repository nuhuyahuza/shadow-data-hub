<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequest extends FormRequest
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
        $storeId = $this->user()?->store?->id;

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:100',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('stores', 'slug')->ignore($storeId),
            ],
        ];

        if ($this->isMethod('PATCH') || $this->isMethod('PUT')) {
            $rules['is_visible'] = ['sometimes', 'boolean'];
            // When making store visible, slug is required for subdomain
            if ($this->boolean('is_visible')) {
                $rules['slug'] = [
                    'required',
                    'string',
                    'max:100',
                    'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                    Rule::unique('stores', 'slug')->ignore($storeId),
                ];
            }
        } else {
            // On create, slug is optional but recommended for when store becomes visible
            $rules['slug'] = [
                'nullable',
                'string',
                'max:100',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                'unique:stores,slug',
            ];
        }

        return $rules;
    }
}
