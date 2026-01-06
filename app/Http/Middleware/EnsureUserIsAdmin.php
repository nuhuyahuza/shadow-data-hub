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

        // If not authenticated, let auth middleware handle redirect
        if (! $user) {
            abort(401, 'Unauthenticated. Please log in to access admin area.');
        }

        // If authenticated but not admin
        if (! $user->isAdmin()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Unauthorized. Admin access required.',
                ], 403);
            }

            // Redirect non-admin users to their dashboard with error message
            return redirect()->route('dashboard')
                ->with('error', 'You do not have permission to access the admin area.');
        }

        // If admin but trying to access via regular login, suggest admin login
        if ($user->isAdmin() && ! $request->routeIs('admin.*') && ! $request->is('admin/*')) {
            // This shouldn't happen, but just in case
        }

        return $next($request);
    }
}
