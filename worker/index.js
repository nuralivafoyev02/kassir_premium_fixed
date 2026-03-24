export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/api/config.js') {
      return new Response(
        `window.__APP_CONFIG__ = ${JSON.stringify({
          SUPABASE_URL: '__SUPABASE_URL__',
          SUPABASE_ANON_KEY: '__SUPABASE_ANON_KEY__'
        })};`,
        {
          headers: {
            'content-type': 'application/javascript; charset=utf-8',
            'cache-control': 'no-store'
          }
        }
      )
    }

    if (url.pathname === '/api/notify-miniapp-tx') {
      return Response.json({ ok: false, error: 'TODO: migrate notify-miniapp-tx route into Worker fetch router' }, { status: 501 })
    }

    return env.ASSETS.fetch(request)
  },

  async scheduled(controller, env, ctx) {
    console.log('TODO: migrate cron-reminders logic to Workers scheduled handler')
  }
}
