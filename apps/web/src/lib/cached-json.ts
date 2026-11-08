/**
 * JSON response the CDN may share between all visitors for `maxAgeSeconds`, then serve stale for
 * as long while it refetches in the background: our functions run about once per window and per
 * CDN region, whatever the number of visitors. Only for successful answers: an error must never
 * be cached, or one M API hiccup would be served to everybody for a whole window.
 */
export function cachedJson(body: unknown, maxAgeSeconds: number): Response {
  return Response.json(body, {
    headers: { "Cache-Control": `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds}` },
  });
}
