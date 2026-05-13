<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DataPackage extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'network',
        'network_id',
        'name',
        'data_size',
        'price',
        'validity',
        'vendor_price',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'vendor_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the transactions for the package.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'package_id');
    }

    /**
     * Get the network for the package.
     */
    public function networkRelation(): BelongsTo
    {
        return $this->belongsTo(Network::class, 'network_id');
    }

    /**
     * Scope a query to only include active packages.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to filter by network.
     */
    public function scopeForNetwork($query, string $network)
    {
        return $query->where('network', $network);
    }
}
