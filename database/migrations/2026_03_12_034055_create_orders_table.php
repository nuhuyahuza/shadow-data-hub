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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unsignedBigInteger('transaction_id')->nullable();
            $table->foreign('transaction_id')->references('id')->on('transactions')->onDelete('set null');
            $table->unsignedBigInteger('store_id')->nullable();
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('set null');
            $table->unsignedBigInteger('data_package_id');
            $table->foreign('data_package_id')->references('id')->on('data_packages')->onDelete('cascade');
            $table->string('network', 50);
            $table->string('phone_number');
            $table->decimal('amount', 10, 2);
            $table->string('status', 50)->default('pending_fulfillment');
            $table->string('vendor_reference')->nullable();
            $table->string('payment_channel', 50)->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('store_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
