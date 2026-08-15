/**
 * Host RPC 客户端：浏览器同源 fetch 调用 Host 半注册的 /api/dsher-bbs/<method>。
 * Host 返回 { ok: true, ...data } 或 { ok: false, error }；调用方按 data.ok 判断。
 */
export async function rpc<T = Record<string, unknown>>(
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch('/api/dsher-bbs/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error('请求失败 (HTTP ' + res.status + ')')
  return (await res.json()) as T
}
