<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('data_packages', function (Blueprint $table) {
            $table->id();
            $table->enum('network', ['mtn', 'telecel', 'airteltigo']);
            $table->string('name');
            $table->string('data_size'); // e.g., "1GB", "500MB"
            $table->decimal('price', 10, 2);
            $table->string('validity'); // e.g., "30 days", "7 days"
            $table->decimal('vendor_price', 10, 2); // Cost from vendor for markup calculation
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_packages');
    }
};
