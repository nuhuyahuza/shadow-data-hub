/**
 * Get the current CSRF token from the document meta tag.
 */
function getCsrfToken(): string {
    return (
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
        ''
    );
}

/**
 * Fetch with CSRF token and credentials. On 419 (CSRF token mismatch),
 * reloads the page so the next load gets a fresh token.
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const { headers: optionsHeaders, ...rest } = options;

    const headers = new Headers(optionsHeaders);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
    }
    if (!headers.has('X-CSRF-TOKEN')) {
        headers.set('X-CSRF-TOKEN', getCsrfToken());
    }

    const response = await fetch(url, {
        ...rest,
        headers,
        credentials: rest.credentials ?? 'include',
    });

    if (response.status === 419) {
        window.location.reload();
        throw new Error('CSRF token mismatch');
    }

    return response;
}
