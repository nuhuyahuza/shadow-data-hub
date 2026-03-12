<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveStoreFromSubdomain
{
    /**
     * Handle an incoming request. Resolve agent store from subdomain (e.g. store-slug.example.com).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->getHost();
        $domain = config('app.domain');
        $reserved = config('app.reserved_subdomains', ['www', 'api', 'admin', 'app']);

        $subdomain = $this->extractSubdomain($host, $domain);

        if ($subdomain === null || in_array(strtolower($subdomain), array_map('strtolower', $reserved), true)) {
            $request->attributes->set('store', null);

            return $next($request);
        }

        $store = Store::query()
            ->where('slug', $subdomain)
            ->where('is_visible', true)
            ->first();

        if (! $store) {
            abort(404, 'Store not found.');
        }

        $request->attributes->set('store', $store);

        return $next($request);
    }

    /**
     * Extract subdomain from host given the app domain.
     * E.g. store.example.com + example.com -> store; example.com -> null.
     */
    private function extractSubdomain(string $host, string $domain): ?string
    {
        $host = strtolower($host);
        $domain = strtolower($domain);

        if ($host === $domain) {
            return null;
        }

        $suffix = '.'.$domain;
        if (str_ends_with($host, $suffix)) {
            $sub = substr($host, 0, -strlen($suffix));

            return $sub !== '' ? $sub : null;
        }

        return null;
    }
}
