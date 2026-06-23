import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 * Next's App Router injects inline bootstrap scripts and next/font + Tailwind
 * inject inline styles, so `'unsafe-inline'` is required without a nonce
 * pipeline. Dev (Turbopack HMR) additionally needs `'unsafe-eval'` and a
 * websocket connection, so those are only relaxed when not in production.
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data:`,
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  // Allow the eSewa / Fonepay checkout forms to POST to their hosted gateways.
  `form-action 'self' https://rc-epay.esewa.com.np https://epay.esewa.com.np https://dev-clientapi.fonepay.com https://clientapi.fonepay.com`,
  `object-src 'none'`,
].join("; ");

/** Defence-in-depth headers applied to every response. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HSTS is honoured only over HTTPS, so it's a no-op (harmless) in local dev.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
