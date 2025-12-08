// IP Whitelist middleware for all routes
const ALLOWED_IPS = ['165.85.178.96', '178.224.222.124'];

export async function onRequest(context) {
  const { request } = context;

  // Get client IP from Cloudflare header
  const clientIP = request.headers.get('CF-Connecting-IP');

  // Check if IP is whitelisted
  if (!ALLOWED_IPS.includes(clientIP)) {
    return new Response('Access Denied: Your IP address is not authorized.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // IP is allowed, continue to the requested resource
  return context.next();
}
