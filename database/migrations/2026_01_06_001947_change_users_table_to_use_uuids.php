<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if users.id is already UUID (migration already completed)
        $isUuid = DB::select("SHOW COLUMNS FROM users WHERE Field = 'id' AND Type LIKE 'char%'");
        if (! empty($isUuid)) {
            // Already converted to UUID, skip
            return;
        }

        // Check if users table has data
        $hasUsers = DB::table('users')->exists();
        $userMappings = [];

        if ($hasUsers) {
            // Check if uuid_temp column already exists (from previous failed migration)
            $hasUuidTemp = Schema::hasColumn('users', 'uuid_temp');

            if (! $hasUuidTemp) {
                // Create temporary UUID column
                Schema::table('users', function (Blueprint $table) {
                    $table->uuid('uuid_temp')->nullable()->after('id');
                });
            }

            // Generate UUIDs for existing users (only if uuid_temp is null)
            $users = DB::table('users')->whereNull('uuid_temp')->get();
            foreach ($users as $user) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['uuid_temp' => Str::uuid()->toString()]);
            }

            // Create mapping table for foreign keys
            $userMappings = DB::table('users')->pluck('uuid_temp', 'id')->toArray();
        }

        // Drop foreign key constraints first (safely)
        $tables = ['sessions', 'wallets', 'transactions'];
        foreach ($tables as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            try {
                // Get foreign key constraint names
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = ? 
                    AND COLUMN_NAME = 'user_id' 
                    AND REFERENCED_TABLE_NAME = 'users'
                ", [$tableName]);

                foreach ($foreignKeys as $fk) {
                    try {
                        DB::statement("ALTER TABLE `{$tableName}` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
                    } catch (\Exception $e) {
                        // Try alternative method using Schema
                        try {
                            Schema::table($tableName, function (Blueprint $table) use ($fk) {
                                $table->dropForeign([$fk->CONSTRAINT_NAME]);
                            });
                        } catch (\Exception $e2) {
                            // Last resort: try dropping by column name
                            try {
                                Schema::table($tableName, function (Blueprint $table) {
                                    $table->dropForeign(['user_id']);
                                });
                            } catch (\Exception $e3) {
                                // Ignore if it doesn't exist
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                // Ignore if foreign key doesn't exist or table doesn't exist
            }
        }

        // Change users.id to UUID
        // First, remove auto-increment if it exists
        DB::statement('ALTER TABLE users MODIFY id BIGINT UNSIGNED NOT NULL');

        // Drop primary key (safely)
        try {
            $hasPrimary = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'users' 
                AND CONSTRAINT_TYPE = 'PRIMARY KEY'
            ");
            if (! empty($hasPrimary)) {
                Schema::table('users', function (Blueprint $table) {
                    $table->dropPrimary();
                });
            }
        } catch (\Exception $e) {
            // Primary key might not exist, continue
        }

        // Change id column to CHAR(36) BEFORE copying UUIDs
        DB::statement('ALTER TABLE users MODIFY id CHAR(36) NOT NULL');

        if ($hasUsers) {
            // Copy UUIDs from temp column to id column
            DB::statement('UPDATE users SET id = uuid_temp');
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('uuid_temp');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->primary('id');
        });

        // Change foreign key column types to UUID first (before updating values)
        if (Schema::hasTable('sessions')) {
            DB::statement('ALTER TABLE sessions MODIFY user_id CHAR(36) NULL');
        }
        if (Schema::hasTable('wallets')) {
            DB::statement('ALTER TABLE wallets MODIFY user_id CHAR(36) NOT NULL');
        }
        if (Schema::hasTable('transactions')) {
            DB::statement('ALTER TABLE transactions MODIFY user_id CHAR(36) NULL');
        }

        // Now update foreign keys with UUIDs if we have existing data
        if ($hasUsers && ! empty($userMappings)) {
            // Update sessions table
            foreach ($userMappings as $oldId => $newUuid) {
                DB::statement('UPDATE sessions SET user_id = ? WHERE user_id = ?', [$newUuid, (string) $oldId]);
            }

            // Update wallets table
            foreach ($userMappings as $oldId => $newUuid) {
                DB::statement('UPDATE wallets SET user_id = ? WHERE user_id = ?', [$newUuid, (string) $oldId]);
            }

            // Update transactions table
            foreach ($userMappings as $oldId => $newUuid) {
                DB::statement('UPDATE transactions SET user_id = ? WHERE user_id = ?', [$newUuid, (string) $oldId]);
            }
        }

        // Re-add foreign key constraints
        if (Schema::hasTable('sessions')) {
            Schema::table('sessions', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        if (Schema::hasTable('wallets')) {
            Schema::table('wallets', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        if (Schema::hasTable('transactions')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign key constraints
        Schema::table('sessions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('wallets', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        // Change users.id back to bigInteger
        Schema::table('users', function (Blueprint $table) {
            $table->dropPrimary();
        });

        DB::statement('ALTER TABLE users MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');

        Schema::table('users', function (Blueprint $table) {
            $table->primary('id');
        });

        // Restore foreign keys to bigInteger
        Schema::table('sessions', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::table('wallets', function (Blueprint $table) {
            $table->foreignId('user_id')->change();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
