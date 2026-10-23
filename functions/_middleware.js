// サイト全体に BASIC 認証をかける（Cloudflare Pages Functions）。
// ユーザー名とパスワードはコードに書かず、Cloudflare 側の環境変数 BASIC_USER / BASIC_PASS に置く。
export async function onRequest({ request, env, next }) {
  const expected = "Basic " + btoa(`${env.BASIC_USER}:${env.BASIC_PASS}`);
  if (env.BASIC_USER && env.BASIC_PASS && request.headers.get("Authorization") === expected) {
    return next();
  }
  return new Response("認証が必要です", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="seminar-sites", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
