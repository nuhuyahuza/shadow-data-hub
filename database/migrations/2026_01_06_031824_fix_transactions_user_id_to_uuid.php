<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if column is already CHAR(36)
        $columnInfo = DB::select("SHOW COLUMNS FROM transactions WHERE Field = 'user_id'");
        if (! empty($columnInfo) && str_contains($columnInfo[0]->Type, 'char')) {
            // Already UUID type, skip
            return;
        }

        // Drop foreign key constraint if it exists
        try {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'transactions' 
                AND COLUMN_NAME = 'user_id' 
                AND REFERENCED_TABLE_NAME = 'users'
            ");

            foreach ($foreignKeys as $fk) {
                try {
                    DB::statement("ALTER TABLE `transactions` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
                } catch (\Exception $e) {
                    // Try alternative method
                    try {
                        Schema::table('transactions', function (Blueprint $table) use ($fk) {
                            $table->dropForeign([$fk->CONSTRAINT_NAME]);
                        });
                    } catch (\Exception $e2) {
                        // Try dropping by column name
                        try {
                            Schema::table('transactions', function (Blueprint $table) {
                                $table->dropForeign(['user_id']);
                            });
                        } catch (\Exception $e3) {
                            // Ignore if it doesn't exist
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            // Ignore if foreign key doesn't exist
        }

        // Update existing user_id values to UUIDs if they exist
        // First, get all unique user_ids from transactions
        $transactionUserIds = DB::table('transactions')
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id')
            ->toArray();

        if (! empty($transactionUserIds)) {
            // Get UUID mappings from users table
            // Since users.id is already UUID, we need to check if transactions have old bigint IDs
            // If transactions have bigint IDs, we need to find the corresponding UUIDs
            // But if users.id is already UUID, then transactions.user_id should already be updated
            // Let's check if there are any mismatches
            $users = DB::table('users')->pluck('id')->toArray();
            
            // If transactions have numeric IDs but users have UUIDs, we need to handle this
            // For now, let's just clear invalid user_ids (they'll be set to null)
            foreach ($transactionUserIds as $userId) {
                // Check if this is a numeric ID (old format)
                if (is_numeric($userId)) {
                    // This is an old bigint ID, we can't map it, so set to null
                    // Or if you have a mapping table, use it here
                    DB::table('transactions')
                        ->where('user_id', $userId)
                        ->update(['user_id' => null]);
                }
            }
        }

        // Change user_id column to CHAR(36) for UUID
        DB::statement('ALTER TABLE transactions MODIFY user_id CHAR(36) NULL');

        // Re-add foreign key constraint
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign key constraint
        try {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
        } catch (\Exception $e) {
            // Ignore if it doesn't exist
        }

        // Change back to bigint (if needed)
        // Note: This will fail if there are UUID values in the column
        // DB::statement('ALTER TABLE transactions MODIFY user_id BIGINT UNSIGNED NULL');
    }
};
