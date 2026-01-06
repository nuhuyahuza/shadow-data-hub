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
        Schema::dropIfExists('wallet_transactions');
        
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unsignedBigInteger('transaction_id')->nullable();
            $table->foreign('transaction_id')->references('id')->on('transactions')->onDelete('set null');
            $table->string('reference')->unique();
            $table->enum('type', ['deduction', 'refund', 'funding'])->default('deduction');
            $table->decimal('amount', 10, 2);
            $table->enum('status', ['pending', 'completed', 'refunded', 'failed'])->default('pending');
            $table->string('original_transaction_reference')->nullable(); // For refunds, link to original transaction
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index('user_id');
            $table->index('transaction_id');
            $table->index('status');
            $table->index('type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
