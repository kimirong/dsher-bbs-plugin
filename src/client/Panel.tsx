/**
 * dsher-bbs-plugin · Client 半 UI：右下角悬浮入口 + 浮层面板。
 * 从动态插件版 client.js 迁移：React.createElement 代码转 TSX，
 * host.call(...) 改为 rpc(...)（同源 fetch Host 的 /api/dsher-bbs）。
 */
import { useEffect, useRef, useState } from 'react'
import { rpc } from './rpc.js'

// bbs.dsher.cn 站点 logo（96×64，base64 内嵌离线可用）
const LOGO_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAYAAADlNHIOAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAALcSURBVHhe7ZxtbtwwDIb9/0d3YKBAA3v/J0vA0G1oYyf2SWKfF1r9SEvi4I8ULSVVhReLxWKxWQwAAP8jAABAAAUU8AcFAMBfFIA/KAChB4UK0R+9SAP3IB7hJj6JK3QNDbgH8Qj28TJuUngJDfdC0Cpc4t7EHfoGHOQehDvcTdxCwx1Bq6BL3IDncIR7EA9xP27oFmY0hO6e9nFXblCeDcO7qL+/W1yDnYA0UjFHzhhJSASkEAtSCEVFnI+BREgyCVJyq6KmI/1rJDQXi0gJCSJOySAzS5CRQ3n2bciqg2cwNxwq6koJjKJMSWItn2T6GEb6lR5hXUw5q4JJxE7kOaXSMm7sqR0IhVpBFWZBIUqgqFEWgWQQJUYYqRF1KDcw14Qjcyixwq6UGp1h0MUKvRF3oQB1rCY0SCyRI1qQJfRU0smyGlCHKsXmKMnWkM9RIlTMWFQqWKWl4F1opWJihd2dWShNMrCJ3aF3X1c+BhQZCwyyUcGtTKjGVUgrlGgphlVmZklxGrLc3KBq6J9HqZw4oVdRwhgKbSHTqhOeUYJLXV7jH6MY6CQdXw2Yk8A3dQv2cV9uUJ4Nw7uov79bXIOdgDRSpmBN3EF23uECcn8SV+jBPYh3sI+XcZPCS2i4F4JW4RL3Ju7QN+Ag9yDc4W7iFhruCFoFXeIGPIcj3IN4iPtxQ7cwoyF097SPu3KD8mwY3kV9/d3iGuwEpJ2KOWLGSCOAhFggJRZUxPkYSCSkmCQlt0rUpKf+NRIaC0lICEniKpICJUmKUmJ9TqTbgywcmUkghVRcKTq2QpaQcYJgNFhGVJg8FV1CSc9SEnkHCyCBFMlqKCaCLRBhlmLKxkJYRW2KqIYVooTVUUu4GauMEudJhTEls4SQ1oQ3tYTsoENHSUuZGWlxRlBZcA3ZSpZSyLphHCxJlZ6lDylBxmCK11F1KWYpi3qYRZDCqimZYaoN6cKJZ3FLlZlglcJVXFOUiDN1Z9qHlTCl0ot6xHPYk7iFTZCRt3sSd+gZcJB7EO5wN3ELDXcErYIucQOewxHuQTzE/bihW5jREA=='

const ALLOWED_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
function isAllowedImageType(t: string): boolean { return ALLOWED_UPLOAD_TYPES.indexOf(t) !== -1 }

const CSS = `
  .dsb-overlay { position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 94vw); z-index: 9999; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base, #ffffff); border-left: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.15)); box-shadow: -8px 0 32px rgba(0,0,0,.35); font-size: 13px; color: var(--dsw-alias-label-primary, #1f2328); pointer-events: auto; }
  .dsb-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.15)); background: var(--dsw-alias-bg-layer-1, #f6f8fa); }
  .dsb-logo { width: 36px; height: 24px; object-fit: contain; flex-shrink: 0; border-radius: 3px; }
  .dsb-head-title { font-weight: 700; font-size: 14px; line-height: 1.2; }
  .dsb-head-sub { font-size: 11px; color: var(--dsw-alias-label-secondary, #57606a); }
  .dsb-spacer { flex: 1; }
  .dsb-btn { border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.22)); background: var(--dsw-alias-bg-layer-2, #ffffff); color: var(--dsw-alias-label-primary, #1f2328); border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; transition: background .15s, border-color .15s; }
  .dsb-btn:hover { border-color: var(--dsw-alias-brand-primary, #0969da); color: var(--dsw-alias-brand-primary, #0969da); background: var(--dsw-alias-bg-layer-2, #f0f2f5); }
  .dsb-btn.primary { background: #0969da; border-color: transparent; color: #fff; }
  .dsb-btn.primary:hover { background: #0a56a5; color: #fff; }
  .dsb-btn.primary:disabled { opacity: .5; cursor: default; }
  .dsb-tabs { display: flex; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.15)); background: var(--dsw-alias-bg-layer-1, #f6f8fa); }
  .dsb-tab { flex: 1; padding: 9px 0; text-align: center; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-secondary, #57606a); border-bottom: 2px solid transparent; }
  .dsb-tab:hover { color: var(--dsw-alias-label-primary, #1f2328); }
  .dsb-tab.active { color: var(--dsw-alias-brand-primary, #0969da); border-bottom-color: var(--dsw-alias-brand-primary, #0969da); font-weight: 700; }
  .dsb-body { flex: 1; overflow-y: auto; padding: 12px; }
  .dsb-auth { padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.15)); background: var(--dsw-alias-bg-layer-1, #f6f8fa); }
  .dsb-auth-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .dsb-input, .dsb-select, .dsb-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.25)); background: var(--dsw-alias-bg-layer-2, #ffffff); color: var(--dsw-alias-label-primary, #1f2328); border-radius: 6px; padding: 6px 8px; font-size: 13px; font-family: inherit; }
  .dsb-input:focus, .dsb-select:focus, .dsb-textarea:focus { outline: none; border-color: #0969da; box-shadow: 0 0 0 2px rgba(9,105,218,.25); }
  .dsb-textarea { min-height: 120px; resize: vertical; }
  .dsb-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .dsb-chip { border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.2)); border-radius: 999px; padding: 4px 12px; font-size: 12px; cursor: pointer; color: var(--dsw-alias-label-secondary, #57606a); background: var(--dsw-alias-bg-layer-2, #ffffff); }
  .dsb-chip:hover { color: var(--dsw-alias-label-primary, #1f2328); border-color: var(--dsw-alias-border-l2, rgba(0,0,0,.35)); }
  .dsb-chip.active { border-color: #0969da; color: #0969da; background: rgba(9,105,218,.15); font-weight: 600; }
  .dsb-row { padding: 10px 6px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.1)); cursor: pointer; border-radius: 6px; }
  .dsb-row:hover { background: rgba(9,105,218,.1); }
  .dsb-row-title { font-weight: 600; line-height: 1.4; }
  .dsb-row-meta { font-size: 11px; color: var(--dsw-alias-label-secondary, #57606a); margin-top: 3px; }
  .dsb-detail-title { font-size: 16px; font-weight: 700; line-height: 1.4; }
  .dsb-detail-meta { font-size: 11px; color: var(--dsw-alias-label-secondary, #57606a); margin: 6px 0 10px; }
  .dsb-prose { line-height: 1.65; overflow-wrap: break-word; }
  .dsb-prose pre { background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.06)); padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  .dsb-prose code { font-size: 12px; }
  .dsb-prose img { max-width: 100%; }
  .dsb-comment { border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12)); border-radius: 8px; padding: 8px 10px; margin-top: 8px; background: var(--dsw-alias-bg-layer-1, #f6f8fa); }
  .dsb-comment-meta { font-size: 11px; color: var(--dsw-alias-label-secondary, #57606a); margin-bottom: 4px; }
  .dsb-error { color: var(--dsw-alias-state-error-primary, #d1242f); font-size: 12px; margin-top: 6px; }
  .dsb-ok { color: var(--dsw-alias-state-success-primary, #1a7f37); font-size: 12px; margin-top: 6px; }
  .dsb-hint { font-size: 11px; color: var(--dsw-alias-label-secondary, #57606a); margin-top: 4px; line-height: 1.5; }
  .dsb-pager { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 10px; font-size: 12px; color: var(--dsw-alias-label-secondary, #57606a); }
  .dsb-empty { text-align: center; color: var(--dsw-alias-label-secondary, #57606a); padding: 24px 0; font-size: 12px; }
  .dsb-loading { text-align: center; color: var(--dsw-alias-label-secondary, #57606a); padding: 18px 0; font-size: 12px; }
  .dsb-link { color: #0969da; cursor: pointer; text-decoration: none; }
  .dsb-link:hover { text-decoration: underline; }
  .dsb-searchbar { display: flex; gap: 8px; margin-bottom: 10px; }
  .dsb-uploading { color: var(--dsw-alias-label-secondary, #57606a); font-size: 12px; margin-top: 6px; }
  .dsb-fab {
    position: fixed; right: 18px; bottom: 18px; z-index: 9999;
    display: flex; align-items: center; gap: 8px;
    height: 46px; padding: 0 16px;
    border: none; border-radius: 23px;
    background: linear-gradient(135deg, #0b6bcb 0%, #0969da 55%, #1f7ae0 100%);
    color: #fff; font-size: 14px; font-weight: 700; letter-spacing: .2px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(9, 60, 130, .45), 0 1px 3px rgba(9, 60, 130, .3);
    pointer-events: auto;
    transition: filter .15s ease, box-shadow .15s ease, transform .15s ease;
    animation: dsb-fab-in .25s ease-out;
  }
  .dsb-fab:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(9, 60, 130, .5); }
  .dsb-fab:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(9, 60, 130, .4); }
  .dsb-fab:focus-visible { outline: 2px solid #0969da; outline-offset: 2px; }
  @keyframes dsb-fab-in { from { opacity: 0; transform: translateY(8px) scale(.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
`

function useInjectStyles(): void {
  useEffect(() => {
    let tag = document.querySelector<HTMLStyleElement>('style[data-plugin="dsher-bbs"]')
    if (tag === null) {
      tag = document.createElement('style')
      tag.dataset.plugin = 'dsher-bbs'
      tag.textContent = CSS
      document.head.appendChild(tag)
    }
    return () => { /* 保留：bundle 卸载时由 loader 清理 plugin 样式 */ }
  }, [])
}

// ── 面板开关（模块级 store，跨组件共享）───────────────────────────────
const store: { open: boolean; listeners: Set<() => void> } = { open: false, listeners: new Set() }
function setOpen(v: boolean): void {
  store.open = v
  store.listeners.forEach(fn => fn())
}
function useOpen(): boolean {
  const [v, setV] = useState(store.open)
  useEffect(() => {
    const fn = () => setV(store.open)
    store.listeners.add(fn)
    return () => { store.listeners.delete(fn) }
  }, [])
  return v
}

function fmtTime(t: string): string { return t || '' }

// 一键登录：弹窗打开论坛 /dsh-login，登录后论坛页 postMessage 回传会话 Cookie。
function openLogin(_provider: string): void {
  try {
    const url = 'https://bbs.dsher.cn/dsh-login?origin=' + encodeURIComponent(window.location.origin)
    window.open(url, '_blank', 'width=480,height=640')
  } catch { /* 弹窗被拦截时用户可走手动 Cookie */ }
}

interface UploadTools {
  uploadFile: (file: File, onInsert: (md: string) => void) => void
  onPaste: (e: React.ClipboardEvent, onInsert: (md: string) => void) => void
}

function useImageUpload(cookie: string, onStatus: (kind: 'info' | 'ok' | 'error', text: string) => void): UploadTools {
  const uploading = useRef(false)
  const finish = () => { uploading.current = false }

  const uploadBase64 = (b64: string, name: string, type: string, onInsert: (md: string) => void): void => {
    if (!b64) { finish(); onStatus('error', '图片转码失败，请改用 PNG/JPG 图片'); return }
    void rpc('upload', { cookie, data: b64, name, type }).then((r) => {
      finish()
      const data = r as { ok: boolean; url?: string; error?: string }
      if (data.ok && data.url) { onInsert('![](' + data.url + ')'); onStatus('ok', '图片已上传') }
      else onStatus('error', data.error || '上传失败，请重试')
    }).catch((e) => {
      finish()
      onStatus('error', '上传失败：' + String((e as Error)?.message ?? e))
    })
  }

  const uploadFile = (file: File, onInsert: (md: string) => void): void => {
    if (!file) return
    if (!cookie) { onStatus('error', '请先一键登录后再上传图片'); return }
    if (file.size > 5 * 1024 * 1024) { onStatus('error', '图片不能超过 5MB'); return }
    if (uploading.current) return
    uploading.current = true
    onStatus('info', '图片上传中…')
    const type = file.type || 'image/png'
    if (!isAllowedImageType(type)) {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const c2d = canvas.getContext('2d')
          if (c2d) c2d.drawImage(img, 0, 0)
          const png = canvas.toDataURL('image/png')
          uploadBase64(String(png).split(',')[1] || '', 'image.png', 'image/png', onInsert)
        }
        img.onerror = () => { finish(); onStatus('error', '图片转码失败（浏览器不支持该格式），请改用 PNG/JPG') }
        img.src = String(reader.result || '')
      }
      reader.onerror = () => { finish(); onStatus('error', '读取图片失败') }
      reader.readAsDataURL(file)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      uploadBase64(String(reader.result || '').split(',')[1] || '', file.name || 'image.png', type, onInsert)
    }
    reader.onerror = () => { finish(); onStatus('error', '读取图片失败') }
    reader.readAsDataURL(file)
  }

  const pickImage = (e: React.ClipboardEvent): File | null => {
    const dt = e.clipboardData
    if (!dt) return null
    if (dt.items && dt.items.length) {
      for (let i = 0; i < dt.items.length; i++) {
        const it = dt.items[i]
        if (it.kind === 'file') {
          try {
            const f = it.getAsFile()
            if (f) return f
          } catch { /* 继续 */ }
        }
      }
    }
    if (dt.files && dt.files.length) {
      for (let i = 0; i < dt.files.length; i++) {
        const f = dt.files[i]
        if (f && f.type && f.type.indexOf('image/') === 0) return f
      }
    }
    return null
  }

  const onPaste = (e: React.ClipboardEvent, onInsert: (md: string) => void): void => {
    const file = pickImage(e)
    if (file) {
      e.preventDefault()
      uploadFile(file, onInsert)
    } else {
      onStatus('error', '未检测到剪贴板图片（请用截图工具复制图片后再粘贴）')
    }
  }

  return { uploadFile, onPaste }
}

function insertAtCursor(ref: React.RefObject<HTMLTextAreaElement>, setValue: (v: string) => void, md: string): void {
  const el = ref.current
  const cur = el ? el.value : ''
  const start = el && el.selectionStart != null ? el.selectionStart : cur.length
  const end = el && el.selectionEnd != null ? el.selectionEnd : cur.length
  const next = cur.slice(0, start) + md + cur.slice(end)
  setValue(next)
  if (el) {
    const pos = start + md.length
    requestAnimationFrame(() => {
      try { el.focus(); el.setSelectionRange(pos, pos) } catch { /* 忽略 */ }
    })
  }
}

// ── 帖子详情 ──────────────────────────────────────────────────────────
function PostDetail({ id, cookie, onBack }: { id: number; cookie: string; onBack: () => void }): JSX.Element {
  const [state, setState] = useState<{ loading: boolean; error: string; post: any; comments: any[] }>({
    loading: true, error: '', post: null, comments: [],
  })
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgKind, setMsgKind] = useState('')
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const img = useImageUpload(cookie, (kind, text) => { setMsgKind(kind); setMsg(text) })

  const load = (): void => {
    setState(s => ({ ...s, loading: true, error: '' }))
    void rpc('post', { id }).then((r) => {
      const data = r as { ok: boolean; post?: any; comments?: any[]; error?: string }
      if (data.ok) setState({ loading: false, error: '', post: data.post, comments: data.comments || [] })
      else setState(s => ({ ...s, loading: false, error: data.error || '加载失败' }))
    })
  }
  useEffect(load, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const vote = (): void => {
    if (!cookie) { setMsg('请先一键登录'); return }
    setBusy(true); setMsg('')
    void rpc('vote', { cookie, postId: id }).then((r) => {
      setBusy(false)
      const data = r as { ok: boolean; error?: string }
      if (data.ok) load()
      else setMsg(data.error || '点赞失败')
    })
  }

  const submitReply = (): void => {
    if (!cookie) { setMsg('请先一键登录'); return }
    if (!reply.trim()) { setMsg('回复不能为空'); return }
    setBusy(true); setMsg('')
    void rpc('createComment', { cookie, postId: id, contentMd: reply }).then((r) => {
      setBusy(false)
      const data = r as { ok: boolean; error?: string }
      if (data.ok) { setReply(''); setMsg('已回复'); load() }
      else setMsg(data.error || '回复失败')
    })
  }

  const s = state
  const msgClass = msgKind === 'ok' ? 'dsb-ok' : msgKind === 'info' ? 'dsb-uploading' : 'dsb-error'
  return (
    <div>
      <button className="dsb-btn" onClick={onBack}>← 返回</button>
      {s.loading && <div className="dsb-loading">加载中…</div>}
      {s.error && <div className="dsb-error">{s.error}</div>}
      {!s.loading && s.post && (
        <div>
          <div className="dsb-detail-title">{s.post.title}</div>
          <div className="dsb-detail-meta">
            {`~/bbs/${s.post.category} · ${s.post.author} · ${fmtTime(s.post.time)} · ${s.post.views} 浏览`}
          </div>
          <div className="dsb-prose" dangerouslySetInnerHTML={{ __html: s.post.contentHtml }} />
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="dsb-btn" onClick={vote} disabled={busy}>
              {`${s.post.liked ? '♥' : '♡'} ${s.post.voteCount}`}
            </button>
            <a className="dsb-link" href={`https://bbs.dsher.cn/forum/post/${id}`} target="_blank" rel="noreferrer">在论坛打开 ↗</a>
          </div>
          <div style={{ marginTop: 14, fontWeight: 600 }}>{`回复（${s.comments.length}）`}</div>
          {s.comments.length === 0 && <div className="dsb-empty">还没有回复</div>}
          {s.comments.map((c: any) => (
            <div key={c.id} className="dsb-comment">
              <div className="dsb-comment-meta">
                {`#${c.floor} · ${c.author} · ${fmtTime(c.time)}` + (c.parentName ? ` · ↳ @${c.parentName}` : '')}
              </div>
              <div className="dsb-prose" dangerouslySetInnerHTML={{ __html: c.contentHtml }} />
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <textarea
              ref={replyRef}
              className="dsb-textarea"
              placeholder="写下你的回复（支持 Markdown；可直接粘贴截图）…"
              value={reply}
              onChange={e => setReply(e.target.value)}
              onPaste={e => img.onPaste(e, md => insertAtCursor(replyRef, setReply, md))}
            />
            <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="dsb-btn" onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'; input.accept = 'image/*'
                input.onchange = () => { if (input.files && input.files[0]) img.uploadFile(input.files[0], md => insertAtCursor(replyRef, setReply, md)) }
                input.click()
              }}>🖼 上传图片</button>
              <button className="dsb-btn primary" onClick={submitReply} disabled={busy}>提交回复</button>
              {msg && <span className={msgClass} style={{ marginLeft: 4 }}>{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 浏览视图（顶部集成搜索） ──────────────────────────────────────────
function BrowseView({ cookie, onOpenPost }: { cookie: string; onOpenPost: (id: number) => void }): JSX.Element {
  const [cats, setCats] = useState<any[] | null>(null)
  const [slug, setSlug] = useState('general')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [state, setState] = useState<{ loading: boolean; error: string; threads: any[]; page: number; totalPages: number }>({
    loading: true, error: '', threads: [], page: 1, totalPages: 1,
  })
  const [searchState, setSearchState] = useState<{ done: boolean; loading: boolean; error: string; results: any[]; count: number }>({
    done: false, loading: false, error: '', results: [], count: 0,
  })

  useEffect(() => {
    void rpc('categories').then((r) => {
      const data = r as { ok: boolean; categories?: any[] }
      if (data.ok && data.categories && data.categories.length) {
        setCats(data.categories)
        setSlug(s => (data.categories!.some((c: any) => c.slug === s) ? s : data.categories![0].slug))
      }
    })
  }, [])

  const loadThreads = (s: string): void => {
    setState(st => ({ ...st, loading: true, error: '' }))
    void rpc('threads', { slug: s, page: 1 }).then((r) => {
      const data = r as { ok: boolean; threads?: any[]; page?: number; totalPages?: number; error?: string }
      if (data.ok) setState({ loading: false, error: '', threads: data.threads || [], page: data.page || 1, totalPages: data.totalPages || 1 })
      else setState(st => ({ ...st, loading: false, error: data.error || '加载失败' }))
    })
  }
  useEffect(() => { if (slug && !searching) loadThreads(slug) }, [slug, searching]) // eslint-disable-line react-hooks/exhaustive-deps

  const goPage = (p: number): void => {
    if (p < 1 || p > state.totalPages) return
    setState(st => ({ ...st, loading: true, error: '' }))
    void rpc('threads', { slug, page: p }).then((r) => {
      const data = r as { ok: boolean; threads?: any[]; page?: number; totalPages?: number; error?: string }
      if (data.ok) setState({ loading: false, error: '', threads: data.threads || [], page: data.page || 1, totalPages: data.totalPages || 1 })
      else setState(st => ({ ...st, loading: false, error: data.error || '加载失败' }))
    })
  }

  const runSearch = (): void => {
    if (!q.trim()) { setSearching(false); return }
    setSearching(true)
    setSearchState(st => ({ ...st, loading: true, error: '', done: false }))
    void rpc('search', { q: q.trim() }).then((r) => {
      const data = r as { ok: boolean; results?: any[]; count?: number; error?: string }
      if (data.ok) setSearchState({ done: true, loading: false, error: '', results: data.results || [], count: data.count || 0 })
      else setSearchState(st => ({ ...st, loading: false, done: true, error: data.error || '搜索失败' }))
    })
  }

  const clearSearch = (): void => {
    setQ(''); setSearching(false)
    setSearchState({ done: false, loading: false, error: '', results: [], count: 0 })
  }

  return (
    <div>
      <div className="dsb-searchbar">
        <input
          className="dsb-input" placeholder="搜索帖子标题…" value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
        />
        <button className="dsb-btn primary" onClick={runSearch} disabled={searchState.loading}>搜索</button>
        {searching && <button className="dsb-btn" onClick={clearSearch}>取消</button>}
      </div>
      {!searching && cats === null && <div className="dsb-loading">加载版块…</div>}
      {!searching && cats && (
        <div className="dsb-chips">
          {cats.map((c: any) => (
            <span key={c.slug} className={'dsb-chip' + (c.slug === slug ? ' active' : '')} onClick={() => setSlug(c.slug)}>
              {c.name}
            </span>
          ))}
        </div>
      )}
      {searching ? (
        <div>
          {searchState.loading && <div className="dsb-loading">搜索中…</div>}
          {searchState.error && <div className="dsb-error">{searchState.error}</div>}
          {searchState.done && !searchState.loading && !searchState.error && searchState.results.length === 0 && (
            <div className="dsb-empty">没有找到相关帖子</div>
          )}
          {searchState.results.map((t: any) => (
            <div key={t.id} className="dsb-row" onClick={() => onOpenPost(t.id)}>
              <div className="dsb-row-title">{t.title}</div>
              <div className="dsb-row-meta">{`${t.author} · ${t.replyCount} 回复 · ${fmtTime(t.time)}`}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {state.loading && <div className="dsb-loading">加载帖子…</div>}
          {state.error && <div className="dsb-error">{state.error}</div>}
          {!state.loading && !state.error && state.threads.length === 0 && <div className="dsb-empty">这个版块还没有帖子</div>}
          {state.threads.map((t: any) => (
            <div key={t.id} className="dsb-row" onClick={() => onOpenPost(t.id)}>
              <div className="dsb-row-title">{(t.pinned ? '📌 ' : '') + (t.starred ? '★ ' : '') + t.title}</div>
              <div className="dsb-row-meta">{`${t.author} · ${t.replyCount} 回复 · ${fmtTime(t.time)}`}</div>
            </div>
          ))}
          {state.totalPages > 1 && (
            <div className="dsb-pager">
              <span className="dsb-link" onClick={() => goPage(state.page - 1)}>‹ 上一页</span>
              <span>{`${state.page} / ${state.totalPages}`}</span>
              <span className="dsb-link" onClick={() => goPage(state.page + 1)}>下一页 ›</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 发帖视图 ──────────────────────────────────────────────────────────
function ComposeView({ cookie, onOpenPost }: { cookie: string; onOpenPost: (id: number) => void }): JSX.Element {
  const [cats, setCats] = useState<any[]>([])
  const [slug, setSlug] = useState('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const img = useImageUpload(cookie, (kind, text) => { setMsgOk(kind === 'ok'); setMsg(text) })

  useEffect(() => {
    void rpc('categories').then((r) => {
      const data = r as { ok: boolean; categories?: any[] }
      if (data.ok && data.categories && data.categories.length) {
        setCats(data.categories)
        setSlug(s => (data.categories!.some((c: any) => c.slug === s) ? s : data.categories![0].slug))
      }
    })
  }, [])

  const submit = (): void => {
    if (!cookie) { setMsgOk(false); setMsg('请先一键登录'); return }
    if (!title.trim()) { setMsgOk(false); setMsg('标题不能为空'); return }
    if (!content.trim()) { setMsgOk(false); setMsg('内容不能为空'); return }
    setBusy(true); setMsg('')
    void rpc('createPost', { cookie, categorySlug: slug, title: title.trim(), contentMd: content.trim() }).then((r) => {
      setBusy(false)
      const data = r as { ok: boolean; postId?: number; error?: string }
      if (data.ok) {
        setMsgOk(true); setMsg(`发帖成功${data.postId ? '（帖子 #' + data.postId + '）' : ''}`)
        setTitle(''); setContent('')
        if (data.postId) onOpenPost(data.postId)
      } else {
        setMsgOk(false); setMsg(data.error || '发帖失败')
      }
    })
  }

  return (
    <div>
      {cats.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <select className="dsb-select" value={slug} onChange={e => setSlug(e.target.value)}>
            {cats.map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      )}
      <input
        className="dsb-input" placeholder="标题（≤120 字）" value={title}
        onChange={e => setTitle(e.target.value)} style={{ marginBottom: 8 }}
      />
      <textarea
        ref={contentRef} className="dsb-textarea"
        placeholder="正文（支持 Markdown，≤10000 字；可直接粘贴截图）…"
        value={content} onChange={e => setContent(e.target.value)}
        onPaste={e => img.onPaste(e, md => insertAtCursor(contentRef, setContent, md))}
      />
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="dsb-btn" onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'; input.accept = 'image/*'
          input.onchange = () => { if (input.files && input.files[0]) img.uploadFile(input.files[0], md => insertAtCursor(contentRef, setContent, md)) }
          input.click()
        }}>🖼 上传图片</button>
        <button className="dsb-btn primary" onClick={submit} disabled={busy}>{busy ? '发布中…' : '发布帖子'}</button>
        {msg && <span className={msgOk ? 'dsb-ok' : 'dsb-error'} style={{ marginLeft: 4 }}>{msg}</span>}
      </div>
    </div>
  )
}

// ── 主面板（含右下角悬浮入口） ────────────────────────────────────────
export function BbsPanel(): JSX.Element | null {
  useInjectStyles()
  const open = useOpen()
  const [tab, setTab] = useState('browse')
  const [cookie, setCookie] = useState('')
  const [user, setUser] = useState<{ name?: string } | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkMsg, setCheckMsg] = useState('')
  const [showManual, setShowManual] = useState(false)

  // 监听论坛 /dsh-login 弹窗回传的会话 Cookie。
  useEffect(() => {
    const onMsg = (e: MessageEvent): void => {
      const d = e.data as { type?: string; cookie?: string }
      if (d && d.type === 'dsh-bbs-session' && d.cookie) {
        setCookie(d.cookie)
        setCheckMsg('已通过一键登录接入')
        void rpc('me', { cookie: d.cookie }).then((r) => {
          const data = r as { ok: boolean; user?: { name?: string } | null }
          if (data.ok && data.user) setUser(data.user)
        })
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  if (!open) {
    // 右下角悬浮入口：品牌蓝胶囊按钮（纯文字），打开面板后自动消失。
    return (
      <button
        className="dsb-fab" type="button"
        title="dsher 社区（bbs.dsher.cn）"
        aria-label="打开 dsher 社区面板"
        onClick={() => setOpen(true)}
      >
        <span>dsher 社区</span>
      </button>
    )
  }

  const verify = (): void => {
    if (!cookie.trim()) { setCheckMsg('Cookie 为空'); return }
    setChecking(true); setCheckMsg('')
    void rpc('me', { cookie }).then((r) => {
      setChecking(false)
      const data = r as { ok: boolean; user?: { name?: string } | null; error?: string }
      if (data.ok) {
        if (data.user) { setUser(data.user); setCheckMsg('已登录：' + data.user.name) }
        else { setUser(null); setCheckMsg('Cookie 无效或已过期') }
      } else setCheckMsg(data.error || '验证失败')
    })
  }

  const logout = (): void => { setCookie(''); setUser(null); setCheckMsg('') }
  const openPost = (id: number): void => { setDetailId(id) }
  const back = (): void => { setDetailId(null) }

  return (
    <div className="dsb-overlay">
      <div className="dsb-head">
        <img className="dsb-logo" src={'data:image/png;base64,' + LOGO_B64} alt="bbs.dsher.cn" />
        <div>
          <div className="dsb-head-title">dsh 社区</div>
          <div className="dsb-head-sub">bbs.dsher.cn</div>
        </div>
        <div className="dsb-spacer" />
        <a className="dsb-link" href="https://bbs.dsher.cn" target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>打开 ↗</a>
        <button className="dsb-btn" onClick={() => setOpen(false)} style={{ padding: '2px 8px' }}>✕</button>
      </div>
      <div className="dsb-auth">
        {!cookie ? (
          <div>
            <div className="dsb-auth-row">
              <button className="dsb-btn" onClick={() => openLogin('github')}>🔑 一键登录 (GitHub)</button>
              <button className="dsb-btn" onClick={() => openLogin('google')}>🔑 一键登录 (Google)</button>
            </div>
            <div className="dsb-hint">点按后在弹出的论坛登录页选择通道完成 OAuth，会话自动接入；无需复制 Cookie。</div>
            <span className="dsb-link" style={{ fontSize: 11 }} onClick={() => setShowManual(!showManual)}>
              {showManual ? '收起手动方式 ▴' : '手动粘贴 Cookie ▾'}
            </span>
            {showManual && (
              <div style={{ marginTop: 6 }}>
                <div className="dsb-auth-row">
                  <input
                    className="dsb-input" type="password"
                    placeholder="会话 Cookie（备用方式）"
                    value={cookie} onChange={e => { setCookie(e.target.value); setUser(null); setCheckMsg('') }}
                  />
                  <button className="dsb-btn" onClick={verify} disabled={checking}>{checking ? '验证中…' : '验证'}</button>
                </div>
                <div className="dsb-hint">登录 bbs.dsher.cn → 开发者工具 → Cookies，复制 better-auth.session_token 的值（含 __Secure- 前缀则一起复制）。</div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="dsb-auth-row">
              <span className="dsb-ok" style={{ margin: 0 }}>{'✓ 已登录' + (user ? '：' + user.name : '')}</span>
              <div className="dsb-spacer" />
              <button className="dsb-btn" onClick={logout}>退出</button>
            </div>
            {checkMsg && <div className="dsb-hint" style={{ marginTop: 4 }}>{checkMsg}</div>}
          </div>
        )}
      </div>
      <div className="dsb-tabs">
        <div className={'dsb-tab' + (tab === 'browse' ? ' active' : '')} onClick={() => { setTab('browse'); setDetailId(null) }}>浏览</div>
        <div className={'dsb-tab' + (tab === 'compose' ? ' active' : '')} onClick={() => { setTab('compose'); setDetailId(null) }}>发帖</div>
      </div>
      <div className="dsb-body">
        {detailId !== null
          ? <PostDetail id={detailId} cookie={cookie} onBack={back} />
          : tab === 'browse' ? <BrowseView cookie={cookie} onOpenPost={openPost} />
          : <ComposeView cookie={cookie} onOpenPost={openPost} />}
      </div>
    </div>
  )
}
