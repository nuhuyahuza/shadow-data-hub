<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private function driver(): string
    {
        return Schema::getConnection()->getDriverName();
    }

    private function idColumnIsUuid(string $table): bool
    {
        if (! Schema::hasTable($table)) {
            return false;
        }

        if ($this->driver() === 'sqlite') {
            $rows = DB::select('PRAGMA table_info('.$table.')');
            foreach ($rows as $row) {
                if ($row->name === 'id') {
                    $type = strtolower((string) $row->type);

                    return str_contains($type, 'char') || str_contains($type, 'text');
                }
            }

            return false;
        }

        $info = DB::select('SHOW COLUMNS FROM `'.$table.'` WHERE Field = ?', ['id']);

        return ! empty($info) && str_contains(strtolower($info[0]->Type), 'char');
    }

    private function safeDropForeign(string $table, string $column): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($column) {
                $blueprint->dropForeign([$column]);
            });
        } catch (\Throwable) {
            if ($this->driver() !== 'mysql') {
                return;
            }

            $foreignKeys = DB::select('
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ?
                AND COLUMN_NAME = ?
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ', [$table, $column]);

            foreach ($foreignKeys as $fk) {
                try {
                    DB::statement('ALTER TABLE `'.$table.'` DROP FOREIGN KEY `'.$fk->CONSTRAINT_NAME.'`');
                } catch (\Throwable) {
                    // ignore
                }
            }
        }
    }

    private function widenFkColumnToUuid(string $table, string $column, bool $nullable): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        $nullSql = $nullable ? 'NULL' : 'NOT NULL';

        if ($this->driver() === 'mysql') {
            DB::statement('ALTER TABLE `'.$table.'` MODIFY `'.$column.'` CHAR(36) '.$nullSql);

            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($column, $nullable) {
            $col = $blueprint->string($column, 36);
            if ($nullable) {
                $col->nullable();
            }
            $col->change();
        });
    }

    /**
     * @return array<int|string, string>
     */
    private function buildUuidMap(string $table): array
    {
        if (! Schema::hasTable($table)) {
            return [];
        }

        if (! Schema::hasColumn($table, 'uuid_temp')) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->uuid('uuid_temp')->nullable();
            });
        }

        $rows = DB::table($table)->select('id')->get();
        $map = [];
        foreach ($rows as $row) {
            $existing = DB::table($table)->where('id', $row->id)->value('uuid_temp');
            $uuid = $existing ?: (string) Str::uuid();
            if (! $existing) {
                DB::table($table)->where('id', $row->id)->update(['uuid_temp' => $uuid]);
            }
            $map[$row->id] = $uuid;
        }

        return $map;
    }

    private function swapPrimaryKeyToUuid(string $table): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'uuid_temp')) {
            return;
        }

        if ($this->driver() === 'mysql') {
            DB::statement('ALTER TABLE `'.$table.'` MODIFY `id` BIGINT UNSIGNED NOT NULL');
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropPrimary();
            });
        } catch (\Throwable) {
            if ($this->driver() === 'mysql') {
                $pk = DB::select("
                    SELECT CONSTRAINT_NAME
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = ?
                    AND CONSTRAINT_TYPE = 'PRIMARY KEY'
                ", [$table]);
                if (! empty($pk)) {
                    DB::statement('ALTER TABLE `'.$table.'` DROP PRIMARY KEY');
                }
            }
        }

        Schema::table($table, function (Blueprint $blueprint) use ($table) {
            if (Schema::hasColumn($table, 'id')) {
                $blueprint->dropColumn('id');
            }
        });

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->renameColumn('uuid_temp', 'id');
        });

        Schema::table($table, function (Blueprint $blueprint) {
            $blueprint->primary('id');
        });

        if ($this->driver() === 'mysql') {
            DB::statement('ALTER TABLE `'.$table.'` MODIFY `id` CHAR(36) NOT NULL');
        }
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if ($this->idColumnIsUuid('networks')) {
            return;
        }

        $this->safeDropForeign('data_packages', 'network_id');
        $this->safeDropForeign('transactions', 'package_id');
        $this->safeDropForeign('store_package_pricing', 'store_id');
        $this->safeDropForeign('store_package_pricing', 'data_package_id');
        $this->safeDropForeign('orders', 'transaction_id');
        $this->safeDropForeign('orders', 'store_id');
        $this->safeDropForeign('orders', 'data_package_id');
        $this->safeDropForeign('vendor_logs', 'transaction_id');
        $this->safeDropForeign('wallet_transactions', 'transaction_id');

        $this->widenFkColumnToUuid('data_packages', 'network_id', true);
        $this->widenFkColumnToUuid('transactions', 'package_id', true);
        $this->widenFkColumnToUuid('store_package_pricing', 'store_id', false);
        $this->widenFkColumnToUuid('store_package_pricing', 'data_package_id', false);
        $this->widenFkColumnToUuid('orders', 'transaction_id', true);
        $this->widenFkColumnToUuid('orders', 'store_id', true);
        $this->widenFkColumnToUuid('orders', 'data_package_id', false);
        $this->widenFkColumnToUuid('vendor_logs', 'transaction_id', true);
        $this->widenFkColumnToUuid('wallet_transactions', 'transaction_id', true);

        $networkMap = $this->buildUuidMap('networks');
        $dataPackageMap = $this->buildUuidMap('data_packages');
        $storeMap = $this->buildUuidMap('stores');
        $transactionMap = $this->buildUuidMap('transactions');
        $this->buildUuidMap('wallets');
        $this->buildUuidMap('store_package_pricing');
        $this->buildUuidMap('orders');
        $this->buildUuidMap('vendor_logs');
        $this->buildUuidMap('otp_verifications');
        $this->buildUuidMap('wallet_transactions');

        foreach (DB::table('data_packages')->whereNotNull('network_id')->select('id', 'network_id')->get() as $row) {
            if (isset($networkMap[$row->network_id])) {
                DB::table('data_packages')->where('id', $row->id)->update(['network_id' => $networkMap[$row->network_id]]);
            }
        }

        foreach (DB::table('transactions')->whereNotNull('package_id')->select('id', 'package_id')->get() as $row) {
            if (isset($dataPackageMap[$row->package_id])) {
                DB::table('transactions')->where('id', $row->id)->update(['package_id' => $dataPackageMap[$row->package_id]]);
            }
        }

        foreach (DB::table('store_package_pricing')->select('id', 'store_id', 'data_package_id')->get() as $row) {
            DB::table('store_package_pricing')->where('id', $row->id)->update([
                'store_id' => $storeMap[$row->store_id] ?? $row->store_id,
                'data_package_id' => $dataPackageMap[$row->data_package_id] ?? $row->data_package_id,
            ]);
        }

        foreach (DB::table('orders')->select('id', 'transaction_id', 'store_id', 'data_package_id')->get() as $row) {
            $updates = [
                'data_package_id' => $dataPackageMap[$row->data_package_id] ?? $row->data_package_id,
            ];
            if ($row->transaction_id !== null && isset($transactionMap[$row->transaction_id])) {
                $updates['transaction_id'] = $transactionMap[$row->transaction_id];
            }
            if ($row->store_id !== null && isset($storeMap[$row->store_id])) {
                $updates['store_id'] = $storeMap[$row->store_id];
            }
            DB::table('orders')->where('id', $row->id)->update($updates);
        }

        foreach (DB::table('vendor_logs')->whereNotNull('transaction_id')->select('id', 'transaction_id')->get() as $row) {
            if (isset($transactionMap[$row->transaction_id])) {
                DB::table('vendor_logs')->where('id', $row->id)->update(['transaction_id' => $transactionMap[$row->transaction_id]]);
            }
        }

        foreach (DB::table('wallet_transactions')->whereNotNull('transaction_id')->select('id', 'transaction_id')->get() as $row) {
            if (isset($transactionMap[$row->transaction_id])) {
                DB::table('wallet_transactions')->where('id', $row->id)->update(['transaction_id' => $transactionMap[$row->transaction_id]]);
            }
        }

        $swapOrder = [
            'vendor_logs',
            'wallet_transactions',
            'otp_verifications',
            'store_package_pricing',
            'orders',
            'transactions',
            'wallets',
            'stores',
            'data_packages',
            'networks',
        ];

        foreach ($swapOrder as $table) {
            $this->swapPrimaryKeyToUuid($table);
        }

        Schema::table('data_packages', function (Blueprint $blueprint) {
            $blueprint->foreign('network_id')->references('id')->on('networks')->onDelete('cascade');
        });

        Schema::table('transactions', function (Blueprint $blueprint) {
            $blueprint->foreign('package_id')->references('id')->on('data_packages')->onDelete('set null');
        });

        Schema::table('store_package_pricing', function (Blueprint $blueprint) {
            $blueprint->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $blueprint->foreign('data_package_id')->references('id')->on('data_packages')->onDelete('cascade');
        });

        Schema::table('orders', function (Blueprint $blueprint) {
            $blueprint->foreign('transaction_id')->references('id')->on('transactions')->onDelete('set null');
            $blueprint->foreign('store_id')->references('id')->on('stores')->onDelete('set null');
            $blueprint->foreign('data_package_id')->references('id')->on('data_packages')->onDelete('cascade');
        });

        Schema::table('vendor_logs', function (Blueprint $blueprint) {
            $blueprint->foreign('transaction_id')->references('id')->on('transactions')->onDelete('set null');
        });

        Schema::table('wallet_transactions', function (Blueprint $blueprint) {
            $blueprint->foreign('transaction_id')->references('id')->on('transactions')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new \RuntimeException('This migration cannot be reversed safely.');
    }
};
