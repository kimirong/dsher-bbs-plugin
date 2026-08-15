// tsdown 双产物配置：
//   1) lib/index.js  — Host 半（Node ESM，Loader 按包名解析为插件）
//   2) lib/client.js — Client 半（浏览器 CJS bundle，走 window.__ModuleLoader__.load
//                      闭包工厂格式，由 @deepseek-ai/dsh-client-modules 的
//                      /plugins/<id>/client.js 路由提供给浏览器）
// 构建：npm run build（= tsdown）
import { defineConfig } from 'tsdown'

const PLUGIN_ID = '@kimirong/dsher-bbs-plugin'

// 平台种子模块（与 @deepseek-ai/dsh-client-web 的 PLATFORM_MODULES 一致）：
// 这些由浏览器侧的 loader 模块表提供，bundle 里保持 external（require 由注入的
// require 解析），绝不能 inline —— 否则会复制出第二份 runtime 实例。
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
] as const

export default defineConfig([
  // ── Host 半：Node ESM ────────────────────────────────────────────────
  {
    name: PLUGIN_ID,
    entry: ['src/host/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    dts: true,
    clean: true,
  },
  // ── Client 半：浏览器 CJS bundle（闭包工厂）──────────────────────────
  {
    name: `${PLUGIN_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    external: [...PLATFORM_MODULES],
    // 平台模块保持 external；其余依赖（如用户包自己的库）全部 inline，
    // 因为 loader 模块表只认识平台种子条目。
    noExternal: (id: string) => (PLATFORM_MODULES.includes(id as never) ? undefined : true),
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
