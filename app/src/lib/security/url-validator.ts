/**
 * URL Validation Utilities
 *
 * Prevents open redirect vulnerabilities and phishing attacks by validating
 * redirect URLs before using them.
 */

/**
 * Check if a redirect URL is safe to use
 * Only allows same-origin redirects or relative paths
 *
 * @param url - The URL to validate
 * @param allowedOrigin - The allowed origin (e.g., from request.url)
 * @returns true if the URL is safe, false otherwise
 */
export function isValidRedirectUrl(url: string, allowedOrigin: string): boolean {
  try {
    // Handle relative paths
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }

    // Parse URLs
    const redirectUrl = new URL(url, allowedOrigin);
    const originUrl = new URL(allowedOrigin);

    // Only allow same-origin redirects
    if (redirectUrl.origin !== originUrl.origin) {
      return false;
    }

    // Additional checks for suspicious patterns
    // Block javascript:, data:, and other dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.some(proto => url.toLowerCase().startsWith(proto))) {
      return false;
    }

    return true;
  } catch {
    // If URL parsing fails, reject it
    return false;
  }
}

/**
 * Sanitize a redirect URL to ensure it's safe
 * Returns a safe default if the URL is invalid
 *
 * @param url - The URL to sanitize
 * @param allowedOrigin - The allowed origin
 * @param defaultPath - Default path to return if URL is invalid
 * @returns A safe redirect URL
 */
export function sanitizeRedirectUrl(
  url: string | null | undefined,
  allowedOrigin: string,
  defaultPath: string = '/dashboard'
): string {
  if (!url) {
    return defaultPath;
  }

  if (isValidRedirectUrl(url, allowedOrigin)) {
    // If it's a relative path, return as-is
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }

    // If it's a full URL, return it
    try {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return defaultPath;
    }
  }

  return defaultPath;
}

/**
 * Extract and validate a callback URL from request parameters
 *
 * @param params - URL search params or object containing the callback URL
 * @param origin - The allowed origin
 * @param paramName - Name of the parameter containing the callback URL
 * @param defaultPath - Default path to return if URL is invalid
 * @returns A safe callback URL
 */
export function extractSafeCallbackUrl(
  params: URLSearchParams | Record<string, string | null | undefined>,
  origin: string,
  paramName: string = 'next',
  defaultPath: string = '/dashboard'
): string {
  const callbackUrl = params instanceof URLSearchParams ? params.get(paramName) : params[paramName];

  return sanitizeRedirectUrl(callbackUrl, origin, defaultPath);
}
