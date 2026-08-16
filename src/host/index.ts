/**
 * dsher-bbs-plugin · Host 半
 *
 * 通过 ctx.webServer 注册 /api/dsher-bbs 前缀路由，把论坛能力暴露为本机 JSON RPC。
 * Client 半（浏览器）同源 fetch 该路由调用 —— 不依赖 Typert @Remote
 * （api-remotes 的客户端装配是静态白名单，第三方包的 remote contribution
 * 不会被自动挂载，见 @deepseek-ai/dsh-api-remotes）。
 *
 * 说明：正式 bundle 插件的 Host 半运行在普通 Node 环境，无沙箱、无 harness
 * 对象（那是动态插件运行器专属）。请求/响应直接走 node:http 的
 * IncomingMessage / ServerResponse。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import * as forum from './forum.js'

type Handler = (args: Record<string, unknown>) => Promise<unknown>

const HANDLERS: Record<string, Handler> = {
  categories: () => forum.categories(),
  latest: () => forum.latest(),
  threads: (a) => forum.threads(a),
  post: (a) => forum.post(a),
  search: (a) => forum.search(a),
  createPost: (a) => forum.createPost(a),
  createComment: (a) => forum.createComment(a),
  vote: (a) => forum.vote(a),
  upload: (a) => forum.upload(a),
  me: (a) => forum.me(a),
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

export default {
  name: 'dsher-bbs-plugin',
  // webServer 是硬依赖：声明 inject 后 cordis 会等 webserver 行激活再装载本插件，
  // 保证 apply 时路由必然注册（用 ctx.get 会在服务就绪前拿到 undefined 而空转）。
  inject: ['webServer'],
  apply(ctx: Context): void {
    const webServer = (ctx as unknown as { webServer: { register(r: unknown): () => void } }).webServer
    ctx.effect(() => webServer.register({
      kind: 'prefix',
      path: '/api/dsher-bbs',
      handler: async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        const pathname = (req.url ?? '').split('?')[0]
        const method = pathname.replace(/^\/api\/dsher-bbs\/?/, '')
        const handler = HANDLERS[method]
        if (handler === undefined) {
          sendJson(res, 404, { ok: false, error: '未知方法: ' + method })
          return
        }
        let args: Record<string, unknown> = {}
        if (req.method === 'POST') {
          try { args = JSON.parse(await readBody(req)) } catch { args = {} }
        }
        try {
          const result = await handler(args)
          sendJson(res, 200, result)
        } catch (e) {
          sendJson(res, 500, { ok: false, error: String((e as Error)?.message ?? e) })
        }
      },
    }))
  },
}
