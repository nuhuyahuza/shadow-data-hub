<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'transaction_id',
        'store_id',
        'data_package_id',
        'network',
        'phone_number',
        'amount',
        'status',
        'vendor_reference',
        'payment_channel',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function dataPackage(): BelongsTo
    {
        return $this->belongsTo(DataPackage::class, 'data_package_id');
    }
}
