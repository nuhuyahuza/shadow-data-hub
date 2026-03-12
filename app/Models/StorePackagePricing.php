<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StorePackagePricing extends Model
{
    protected $table = 'store_package_pricing';

    protected $fillable = [
        'store_id',
        'data_package_id',
        'price',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
        ];
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
