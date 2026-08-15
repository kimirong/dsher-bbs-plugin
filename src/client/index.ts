/**
 * dsher-bbs-plugin · Client 半插件入口。
 * 浏览器 bundle 经 @deepseek-ai/dsh-client-modules 的 /plugins/<id>/client.js 提供，
 * 由 modules 扫描本包 package.json 的 dsh.client 声明后注册进浏览器模块表。
 *
 * 只注册 shell.overlay 一个槽位：未打开时渲染右下角「dsher 社区」悬浮按钮，
 * 打开时渲染右侧面板（见 Panel.tsx）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { createElement as h } from 'react'
import { BbsPanel } from './Panel.js'

type AnyCtx = Context & {
  get(name: string): unknown
  inject(deps: readonly string[], fn: (scope: AnyCtx) => void): void
}

export default {
  name: 'dsher-bbs-plugin/client',
  // 官方 client 插件模式：ctx.inject(['slots'], cb) 等 slots 服务就绪再回调；
  // 直接用 ctx.get('slots') 会在服务激活前拿到 undefined，导致 UI 从不注册。
  apply(ctx: Context): void {
    ;(ctx as AnyCtx).inject(['slots'], (scope: AnyCtx) => {
      const slots = scope.get('slots') as {
        inject(name: string, fn: () => void): void
        register(sel: unknown, fn: (props: unknown) => unknown): void
      }
      slots.inject('shell.overlay', () => slots.register(
        { name: 'shell.overlay', id: 'dsher-bbs-panel' },
        () => h(BbsPanel),
      ))
    })
  },
}
