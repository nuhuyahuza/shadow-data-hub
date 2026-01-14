<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // If not authenticated
        if (! $user) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated. Please log in to access admin area.',
                ], 401);
            }

            // Redirect to admin login for web requests
            return redirect()->route('admin.login');
        }

        // If authenticated but not admin
        if (! $user->isAdmin()) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthorized. Admin access required.',
                ], 403);
            }

            // Redirect non-admin users to their dashboard with error message
            return redirect()->route('dashboard')
                ->with('error', 'You do not have permission to access the admin area.');
        }

        return $next($request);
    }
}
