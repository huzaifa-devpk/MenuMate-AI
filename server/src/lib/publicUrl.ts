/** Build the public menu URL from the configured application base, never a hardcoded host. */
export function publicMenuUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/m/${slug}`;
}

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || host.startsWith("127.")) return true;
  const match = /^172\.(\d+)\./.exec(host);
  if (match) {
    const octet = Number(match[1]);
    if (octet >= 16 && octet <= 31) return true;
  }
  return false;
}

export function isLocalBaseUrl(baseUrl: string): boolean {
  try {
    return isLocalHostname(new URL(baseUrl).hostname);
  } catch {
    return true;
  }
}
