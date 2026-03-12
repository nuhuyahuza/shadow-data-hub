<?php

namespace Database\Factories;

use App\Models\Network;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DataPackage>
 */
class DataPackageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $network = Network::first() ?? Network::create([
            'name' => 'MTN',
            'code' => 'mtn',
            'is_active' => true,
        ]);

        return [
            'network' => $network->code,
            'network_id' => $network->id,
            'name' => fake()->words(2, true),
            'data_size' => '1GB',
            'price' => fake()->randomFloat(2, 5, 50),
            'validity' => '30 days',
            'vendor_price' => fake()->randomFloat(2, 3, 40),
            'is_active' => true,
        ];
    }
}
