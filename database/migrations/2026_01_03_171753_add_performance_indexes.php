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
        // Additional indexes for better query performance
        Schema::table('otp_verifications', function (Blueprint $table) {
            $table->index(['phone', 'expires_at']);
            $table->index('verified_at');
        });

        Schema::table('vendor_logs', function (Blueprint $table) {
            $table->index('transaction_id');
            $table->index('status_code');
            $table->index('created_at');
        });

        Schema::table('data_packages', function (Blueprint $table) {
            $table->index(['network', 'is_active']);
            $table->index('price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('otp_verifications', function (Blueprint $table) {
            $table->dropIndex(['phone', 'expires_at']);
            $table->dropIndex(['verified_at']);
        });

        Schema::table('vendor_logs', function (Blueprint $table) {
            $table->dropIndex(['transaction_id']);
            $table->dropIndex(['status_code']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('data_packages', function (Blueprint $table) {
            $table->dropIndex(['network', 'is_active']);
            $table->dropIndex(['price']);
        });
    }
};
