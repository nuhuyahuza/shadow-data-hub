<?php

namespace Database\Seeders;

use App\Models\DataPackage;
use Illuminate\Database\Seeder;

class DataPackageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $packages = [
            // MTN Packages
            [
                'network' => 'mtn',
                'name' => 'MTN 500MB',
                'data_size' => '500MB',
                'price' => 2.50,
                'vendor_price' => 2.00,
                'validity' => '7 days',
                'is_active' => true,
            ],
            [
                'network' => 'mtn',
                'name' => 'MTN 1GB',
                'data_size' => '1GB',
                'price' => 4.50,
                'vendor_price' => 3.80,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'mtn',
                'name' => 'MTN 2GB',
                'data_size' => '2GB',
                'price' => 8.50,
                'vendor_price' => 7.20,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'mtn',
                'name' => 'MTN 5GB',
                'data_size' => '5GB',
                'price' => 18.00,
                'vendor_price' => 15.50,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'mtn',
                'name' => 'MTN 10GB',
                'data_size' => '10GB',
                'price' => 32.00,
                'vendor_price' => 28.00,
                'validity' => '30 days',
                'is_active' => true,
            ],

            // Telecel Packages
            [
                'network' => 'telecel',
                'name' => 'Telecel 500MB',
                'data_size' => '500MB',
                'price' => 2.50,
                'vendor_price' => 2.00,
                'validity' => '7 days',
                'is_active' => true,
            ],
            [
                'network' => 'telecel',
                'name' => 'Telecel 1GB',
                'data_size' => '1GB',
                'price' => 4.50,
                'vendor_price' => 3.80,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'telecel',
                'name' => 'Telecel 2GB',
                'data_size' => '2GB',
                'price' => 8.50,
                'vendor_price' => 7.20,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'telecel',
                'name' => 'Telecel 5GB',
                'data_size' => '5GB',
                'price' => 18.00,
                'vendor_price' => 15.50,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'telecel',
                'name' => 'Telecel 10GB',
                'data_size' => '10GB',
                'price' => 32.00,
                'vendor_price' => 28.00,
                'validity' => '30 days',
                'is_active' => true,
            ],

            // AirtelTigo Packages
            [
                'network' => 'airteltigo',
                'name' => 'AirtelTigo 500MB',
                'data_size' => '500MB',
                'price' => 2.50,
                'vendor_price' => 2.00,
                'validity' => '7 days',
                'is_active' => true,
            ],
            [
                'network' => 'airteltigo',
                'name' => 'AirtelTigo 1GB',
                'data_size' => '1GB',
                'price' => 4.50,
                'vendor_price' => 3.80,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'airteltigo',
                'name' => 'AirtelTigo 2GB',
                'data_size' => '2GB',
                'price' => 8.50,
                'vendor_price' => 7.20,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'airteltigo',
                'name' => 'AirtelTigo 5GB',
                'data_size' => '5GB',
                'price' => 18.00,
                'vendor_price' => 15.50,
                'validity' => '30 days',
                'is_active' => true,
            ],
            [
                'network' => 'airteltigo',
                'name' => 'AirtelTigo 10GB',
                'data_size' => '10GB',
                'price' => 32.00,
                'vendor_price' => 28.00,
                'validity' => '30 days',
                'is_active' => true,
            ],
        ];

        foreach ($packages as $package) {
            DataPackage::updateOrCreate(
                [
                    'network' => $package['network'],
                    'name' => $package['name'],
                ],
                $package
            );
        }
    }
}
