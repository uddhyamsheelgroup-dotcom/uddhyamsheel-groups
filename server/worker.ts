/**
 * Cloudflare Worker Entry Point
 * Uddhyamsheel Group Management System
 * 
 * Supports deployment via:
 *   npx wrangler deploy
 * 
 * Routes incoming requests:
 * 1. /api/* -> Authoritative Cloudflare D1 + Web Crypto API gateway
 * 2. Static Assets (dist/) -> Served by Cloudflare Workers Assets binding (env.ASSETS)
 * 3. SPA Fallback -> Serves index.html for client-side navigation
 */

import { onRequest } from "../functions/api/[[route]].js";

export interface Env {
  DB: any;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  ENVIRONMENT?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PIN?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Route all API requests to the authoritative Cloudflare D1 API gateway
    if (url.pathname.startsWith("/api")) {
      return onRequest({ request, env });
    }

    // 2. Serve static client assets (HTML, JS, CSS, media) via Workers Static Assets binding
    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      // SPA Fallback: if route is not an asset file with an extension, return index.html
      if (assetRes.status === 404 && !url.pathname.includes(".")) {
        const indexUrl = new URL("/", request.url);
        return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
      }
      return assetRes;
    }

    return new Response("Not Found", { status: 404 });
  }
};
