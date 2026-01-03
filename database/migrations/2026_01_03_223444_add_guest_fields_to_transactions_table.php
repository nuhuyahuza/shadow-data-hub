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
        Schema::table('transactions', function (Blueprint $table) {
            // Make user_id nullable for guest purchases
            $table->foreignId('user_id')->nullable()->change();

            // Add guest tracking fields
            $table->string('guest_phone')->nullable()->after('user_id');
            $table->string('payment_method')->nullable()->after('phone_number');
            $table->string('payment_phone')->nullable()->after('payment_method');

            // Add indexes for guest tracking
            $table->index('guest_phone');
            $table->index('payment_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['guest_phone']);
            $table->dropIndex(['payment_method']);
            $table->dropColumn(['guest_phone', 'payment_method', 'payment_phone']);
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
