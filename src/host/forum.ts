/**
 * 论坛访问层：从动态插件版 host.js 迁移而来。
 * 关键差异：正式 bundle 插件的 Host 半运行在普通 Node 环境（无沙箱），
 * 全局 fetch / FormData / Blob / Buffer 直接可用，不再需要 shell + curl。
 *
 * 读取走 HTML 抓取 + 正则解析（论坛是 Hono + htmx 服务端渲染，无公开 JSON API）；
 * 写操作需要会话 Cookie（Better Auth）与 Origin 头（论坛 CSRF 校验）。
 */

export const BASE = 'https://bbs.dsher.cn'
export const ORIGIN = 'https://bbs.dsher.cn'
export const SEED_CATEGORY_IDS: Record<string, number> = { general: 1, help: 2, 'plugin-dev': 3, announce: 4 }

export interface ThreadRow {
  id: number
  title: string
  pinned: boolean
  starred: boolean
  authorId: string
  author: string
  replyCount: number
  time: string
}

export interface Category {
  slug: string
  name: string
  description: string
}

export interface CommentRow {
  id: number
  authorId: string
  author: string
  floor: number
  time: string
  parentId: number | null
  parentName: string | null
  contentHtml: string
  liked: boolean
  voteCount: number
}

export interface PostDetail {
  title: string
  category: string
  authorId: string
  author: string
  time: string
  views: number
  contentHtml: string
  liked: boolean
  voteCount: number
  replyCount: number
}

export interface RpcOk<T = unknown> { ok: true; [key: string]: unknown }
export interface RpcErr { ok: false; error: string }
export type Rpc<T = unknown> = RpcOk<T> | RpcErr

function decodeEntities(s: unknown): string {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
}

function sanitizeHtml(html: string): string {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
}

function parseCategories(html: string): Category[] {
  const out: Category[] = []
  const re = /<a href="\/forum\/([a-z0-9-]+)" class="group block[^"]*">([\s\S]*?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const [, slug, block] = m
    const name = (block.match(/text-lg font-semibold">([^<]*)</) || [])[1]
    const desc = (block.match(/mt-0\.5 text-sm[^"]*">([^<]*)</) || [])[1]
    out.push({ slug, name: decodeEntities(name || ''), description: decodeEntities(desc || '') })
  }
  return out
}

// 兼容论坛 2026-08 改版前后的两种 li class（新版含 md: 前缀，旧版以 gap-4 结尾）。
function parseThreadRows(html: string): ThreadRow[] {
  const out: ThreadRow[] = []
  const re = /<li class="flex flex-col gap-1 px-4 py-3 md:flex-row[^"]*">([\s\S]*?)<\/li>|<li class="flex items-baseline justify-between gap-4 px-4 py-3">([\s\S]*?)<\/li>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const block = m[1] || m[2]
    if (!block) continue
    const link = (block.match(/href="\/forum\/post\/(\d+)"[^>]*>([\s\S]*?)<\/a>/) || [])
    if (!link[1]) continue
    const titleRaw = link[2] || ''
    const pinned = titleRaw.includes('📌')
    const starred = titleRaw.includes('★')
    const title = decodeEntities(titleRaw.replace(/<[^>]+>/g, '').replace(/[📌★]/g, '').trim())
    const author = (block.match(/href="\/u\/([^"]+)"[^>]*>([^<]*)<\/a>/) || [])
    const reply = (block.match(/<span>(\d+) 回复<\/span>/) || [])
    const time = (block.match(/<span>(\d{4}-\d{2}-\d{2} \d{2}:\d{2})<\/span>/) || [])
    out.push({
      id: Number(link[1]), title, pinned, starred,
      authorId: author[1] || '', author: decodeEntities(author[2] || ''),
      replyCount: reply[1] ? Number(reply[1]) : 0,
      time: time[1] || '',
    })
  }
  return out
}

function parsePagination(html: string): { current: number; totalPages: number } {
  const nav = (html.match(/<nav class="flex items-center justify-center gap-1 font-mono text-xs" aria-label="分页">([\s\S]*?)<\/nav>/) || [])[1]
  if (!nav) return { current: 1, totalPages: 1 }
  const pages = [...nav.matchAll(/href="[^"]*\?page=(\d+)"/g)].map(x => Number(x[1]))
  const cur = (nav.match(/bg-accent-600[^>]*>(\d+)</) || [])[1]
  const total = pages.length ? Math.max(...pages) : 1
  return { current: cur ? Number(cur) : 1, totalPages: Math.max(total, cur ? Number(cur) : 1) }
}

function parsePost(html: string): PostDetail {
  const title = (html.match(/<h1 class="mt-2 text-2xl font-bold tracking-tight">([^<]*)<\/h1>/) || [])[1]
  const cat = (html.match(/href="\/forum\/([a-z0-9-]+)" class="hover:text-accent-600[^"]*">~\/bbs\//) || [])[1]
  const author = (html.match(/href="\/u\/([^"]+)" class="font-medium[^"]*">([^<]*)<\/a>/) || [])
  const time = (html.match(/<span class="mx-2 text-hairline-strong dark:text-gray-700">\/<\/span>(\d{4}-\d{2}-\d{2} \d{2}:\d{2})<span/) || [])[1]
  const views = (html.match(/(\d+) 浏览/) || [])[1]
  const content = (html.match(/<article class="rounded-lg border border-hairline bg-surface p-6 dark:border-gray-800 dark:bg-gray-900">\s*<div class="prose prose-gray max-w-none dark:prose-invert">([\s\S]*?)<\/div>/) || [])[1]
  const vote = (html.match(/<button type="button" hx-post="\/api\/forum\/posts\/\d+\/vote"[\s\S]*?>([♡♥]) (\d+)<\/button>/) || [])
  const replyHeading = (html.match(/回复（(\d+)）/) || [])[1]
  return {
    title: decodeEntities(title || ''), category: cat || '',
    authorId: author[1] || '', author: decodeEntities(author[2] || ''),
    time: time || '', views: views ? Number(views) : 0,
    contentHtml: sanitizeHtml((content || '').trim()),
    liked: vote[1] === '♥', voteCount: vote[2] ? Number(vote[2]) : 0,
    replyCount: replyHeading ? Number(replyHeading) : 0,
  }
}

function parseComments(html: string): CommentRow[] {
  const out: CommentRow[] = []
  const re = /<li key="c-\d+" id="c-(\d+)" class="scroll-mt-24[^"]*">([\s\S]*?)<\/li>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const [, id, block] = m
    const author = (block.match(/href="\/u\/([^"]+)" class="text-ink-soft[^"]*">([^<]*)<\/a>/) || [])
    const floor = (block.match(/<span>#(\d+) 楼<\/span>/) || [])[1]
    const time = (block.match(/<span>(\d{4}-\d{2}-\d{2} \d{2}:\d{2})<\/span>/) || [])[1]
    const parent = (block.match(/href="#c-(\d+)"[^>]*>\s*↳ 回复 @([^<]*)<\/a>/) || [])
    const content = (block.match(/<div class="prose prose-gray mt-2 max-w-none text-sm dark:prose-invert">([\s\S]*?)<\/div>/) || [])[1]
    const vote = (block.match(/hx-post="\/api\/forum\/comments\/\d+\/vote"[\s\S]*?>([♡♥]) (\d+)<\/button>/) || [])
    out.push({
      id: Number(id),
      authorId: author[1] || '', author: decodeEntities(author[2] || ''),
      floor: floor ? Number(floor) : 0, time: time || '',
      parentId: parent[1] ? Number(parent[1]) : null,
      parentName: parent[2] ? decodeEntities(parent[2]) : null,
      contentHtml: sanitizeHtml((content || '').trim()),
      liked: vote[1] === '♥', voteCount: vote[2] ? Number(vote[2]) : 0,
    })
  }
  return out
}

function extractError(body: string): string {
  const m = String(body).match(/<p class="text-sm text-red-600[^"]*">([\s\S]*?)<\/p>/)
  return m ? decodeEntities(m[1]).trim() : ''
}

async function getText(path: string, cookie = ''): Promise<string> {
  const res = await fetch(BASE + path, {
    headers: cookie ? { Cookie: cookie } : {},
  })
  return res.text()
}

async function apiPost(path: string, body: unknown, cookie: string): Promise<{ status: number; redirect: string; body: string }> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
  return {
    status: res.status,
    redirect: res.headers.get('hx-redirect') ?? '',
    body: await res.text(),
  }
}

async function categoryIds(cookie: string): Promise<Record<string, number>> {
  const map: Record<string, number> = { ...SEED_CATEGORY_IDS }
  if (!cookie) return map
  try {
    const raw = await getText('/forum/new', cookie)
    const re = /<option value="(\d+)">([^<]+)<\/option>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(raw))) map[m[2].trim()] = Number(m[1])
  } catch { /* 保持种子映射 */ }
  return map
}

// ── 9 个 RPC 方法（与动态插件版 harness.handle 一一对应）───────────────

export async function categories(): Promise<Rpc> {
  try {
    const html = await getText('/forum')
    return { ok: true, categories: parseCategories(html) }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

export async function threads(args: { slug?: string; page?: number } = {}): Promise<Rpc> {
  try {
    const slug = String(args.slug || 'general')
    const page = Math.max(1, Number(args.page) || 1)
    const html = await getText(`/forum/${encodeURIComponent(slug)}?page=${page}`)
    const rows = parseThreadRows(html)
    const { current, totalPages } = parsePagination(html)
    return { ok: true, slug, threads: rows, page: current, totalPages }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

export async function post(args: { id?: number } = {}): Promise<Rpc> {
  try {
    const id = Number(args.id)
    if (!Number.isInteger(id) || id <= 0) return { ok: false, error: '帖子 id 无效' }
    const html = await getText(`/forum/post/${id}`)
    return { ok: true, id, post: parsePost(html), comments: parseComments(html) }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

export async function search(args: { q?: string } = {}): Promise<Rpc> {
  try {
    const q = String(args.q || '').trim()
    if (!q) return { ok: false, error: '搜索词为空' }
    const html = await getText('/search?q=' + encodeURIComponent(q))
    const results = parseThreadRows(html)
    const countM = html.match(/找到 (\d+) 条结果/)
    return { ok: true, q, count: countM ? Number(countM[1]) : results.length, results }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

export async function createPost(args: { cookie?: string; categoryId?: number; categorySlug?: string; title?: string; contentMd?: string } = {}): Promise<Rpc> {
  try {
    const cookie = String(args.cookie || '').trim()
    if (!cookie) return { ok: false, error: '未登录，请先点击「一键登录」' }
    const title = String(args.title || '').trim()
    const contentMd = String(args.contentMd || '').trim()
    if (!title) return { ok: false, error: '标题不能为空' }
    if (!contentMd) return { ok: false, error: '内容不能为空' }
    const ids = await categoryIds(cookie)
    const slug = String(args.categorySlug || '')
    const bySlug = SEED_CATEGORY_IDS[slug]
    const byName = ids[slug]
    const categoryId = Number(args.categoryId) || bySlug || byName || ids.general || SEED_CATEGORY_IDS.general
    const r = await apiPost('/api/forum/posts', { categoryId, title, contentMd }, cookie)
    if (r.status === 201 && r.redirect) {
      const m = r.redirect.match(/\/forum\/post\/(\d+)/)
      return { ok: true, postId: m ? Number(m[1]) : null, url: BASE + r.redirect }
    }
    return { ok: false, error: extractError(r.body) || ('HTTP ' + r.status) }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

export async function createComment(args: { cookie?: string; postId?: number; contentMd?: string } = {}): Promise<Rpc> {
  try {
    const cookie = String(args.cookie || '').trim()
    if (!cookie) return { ok: false, error: '未登录，请先点击「一键登录」' }
    const postId = Number(args.postId)
    const contentMd = String(args.contentMd || '').trim()
    if (!contentMd) return { ok: false, error: '回复内容不能为空' }
    const r = await apiPost(`/api/forum/posts/${postId}/comments`, { contentMd }, cookie)
    if (r.status === 201) return { ok: true, url: `${BASE}/forum/post/${postId}` }
    return { ok: false, error: extractError(r.body) || ('HTTP ' + r.status) }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

export async function vote(args: { cookie?: string; postId?: number } = {}): Promise<Rpc> {
  try {
    const cookie = String(args.cookie || '').trim()
    if (!cookie) return { ok: false, error: '未登录，请先点击「一键登录」' }
    const postId = Number(args.postId)
    const r = await apiPost(`/api/forum/posts/${postId}/vote`, {}, cookie)
    if (r.status === 200 || r.status === 201) {
      const m = r.body.match(/>([♡♥]) (\d+)<\/button>/)
      return { ok: true, liked: m ? m[1] === '♥' : false, voteCount: m ? Number(m[2]) : 0 }
    }
    return { ok: false, error: extractError(r.body) || ('HTTP ' + r.status) }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

export async function upload(args: { cookie?: string; data?: string; name?: string; type?: string } = {}): Promise<Rpc> {
  try {
    const cookie = String(args.cookie || '').trim()
    if (!cookie) return { ok: false, error: '未登录，请先点击「一键登录」' }
    const data = String(args.data || '').trim()
    if (!data) return { ok: false, error: '图片数据为空' }
    const name = String(args.name || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_')
    const type = String(args.type || 'image/png').replace(/[^a-zA-Z0-9._+-/]/g, '')
    const fd = new FormData()
    fd.append('image', new Blob([Buffer.from(data, 'base64')], { type }), name)
    const res = await fetch(BASE + '/api/uploads', {
      method: 'POST',
      headers: { Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
      body: fd,
    })
    const trimmed = (await res.text()).trim()
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && parsed.url) return { ok: true, url: parsed.url }
    } catch { /* 落到统一错误 */ }
    return { ok: false, error: extractError(trimmed) || ('上传失败，服务端返回: ' + trimmed.slice(0, 120)) }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

export async function me(args: { cookie?: string } = {}): Promise<Rpc> {
  try {
    const cookie = String(args.cookie || '').trim()
    if (!cookie) return { ok: true, user: null }
    const raw = await getText('/api/auth/get-session', cookie)
    let data: { user?: { id?: string; name?: string; image?: string | null } } | null = null
    try { data = JSON.parse(raw) } catch { data = null }
    if (data && data.user) {
      return { ok: true, user: { id: data.user.id, name: data.user.name, image: data.user.image || null } }
    }
    return { ok: true, user: null }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}
