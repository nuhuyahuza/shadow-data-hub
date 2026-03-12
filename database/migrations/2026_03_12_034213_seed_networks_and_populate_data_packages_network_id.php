<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $networks = [
            ['name' => 'MTN', 'code' => 'mtn', 'is_active' => true],
            ['name' => 'Telecel', 'code' => 'telecel', 'is_active' => true],
            ['name' => 'AirtelTigo', 'code' => 'airteltigo', 'is_active' => true],
        ];

        foreach ($networks as $network) {
            DB::table('networks')->updateOrInsert(
                ['code' => $network['code']],
                array_merge($network, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        $networkIds = DB::table('networks')->pluck('id', 'code');

        foreach ($networkIds as $code => $id) {
            DB::table('data_packages')->where('network', $code)->update(['network_id' => $id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('data_packages')->update(['network_id' => null]);
        DB::table('networks')->truncate();
    }
};
