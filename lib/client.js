window.__ModuleLoader__.load({
	id: "@kimirong/dsher-bbs-plugin",
	factory: (require) => {
		var module = { exports: {} };
		module.exports;
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/rpc.ts
		/**
		* Host RPC 客户端：浏览器同源 fetch 调用 Host 半注册的 /api/dsher-bbs/<method>。
		* Host 返回 { ok: true, ...data } 或 { ok: false, error }；调用方按 data.ok 判断。
		*/
		async function rpc(method, args = {}) {
			const res = await fetch("/api/dsher-bbs/" + method, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args)
			});
			if (!res.ok) throw new Error("请求失败 (HTTP " + res.status + ")");
			return await res.json();
		}
		//#endregion
		//#region src/client/Panel.tsx
		/**
		* dsher-bbs-plugin · Client 半 UI：右下角悬浮入口 + 浮层面板。
		* 从动态插件版 client.js 迁移：React.createElement 代码转 TSX，
		* host.call(...) 改为 rpc(...)（同源 fetch Host 的 /api/dsher-bbs）。
		*/
		const ALLOWED_UPLOAD_TYPES = [
			"image/png",
			"image/jpeg",
			"image/gif",
			"image/webp"
		];
		function isAllowedImageType(t) {
			return ALLOWED_UPLOAD_TYPES.indexOf(t) !== -1;
		}
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
  .dsb-viewtabs { display: flex; gap: 6px; margin-bottom: 10px; }
  .dsb-viewtab {
    border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.2));
    border-radius: 6px; padding: 5px 14px; font-size: 12px; font-weight: 600;
    cursor: pointer; color: var(--dsw-alias-label-secondary, #57606a);
    background: var(--dsw-alias-bg-layer-2, #ffffff);
    transition: color .15s ease, border-color .15s ease, background .15s ease;
  }
  .dsb-viewtab:hover { color: var(--dsw-alias-label-primary, #1f2328); border-color: var(--dsw-alias-border-l2, rgba(0,0,0,.35)); }
  .dsb-viewtab.active { border-color: #0969da; color: #0969da; background: rgba(9,105,218,.12); }
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
`;
		function useInjectStyles() {
			(0, react.useEffect)(() => {
				let tag = document.querySelector("style[data-plugin=\"dsher-bbs\"]");
				if (tag === null) {
					tag = document.createElement("style");
					tag.dataset.plugin = "dsher-bbs";
					tag.textContent = CSS;
					document.head.appendChild(tag);
				}
				return () => {};
			}, []);
		}
		const store = {
			open: false,
			listeners: /* @__PURE__ */ new Set()
		};
		function setOpen(v) {
			store.open = v;
			store.listeners.forEach((fn) => fn());
		}
		function useOpen() {
			const [v, setV] = (0, react.useState)(store.open);
			(0, react.useEffect)(() => {
				const fn = () => setV(store.open);
				store.listeners.add(fn);
				return () => {
					store.listeners.delete(fn);
				};
			}, []);
			return v;
		}
		function fmtTime(t) {
			return t || "";
		}
		function openLogin(_provider) {
			try {
				const url = "https://bbs.dsher.cn/dsh-login?origin=" + encodeURIComponent(window.location.origin);
				window.open(url, "_blank", "width=480,height=640");
			} catch {}
		}
		function useImageUpload(cookie, onStatus) {
			const uploading = (0, react.useRef)(false);
			const finish = () => {
				uploading.current = false;
			};
			const uploadBase64 = (b64, name, type, onInsert) => {
				if (!b64) {
					finish();
					onStatus("error", "图片转码失败，请改用 PNG/JPG 图片");
					return;
				}
				rpc("upload", {
					cookie,
					data: b64,
					name,
					type
				}).then((r) => {
					finish();
					const data = r;
					if (data.ok && data.url) {
						onInsert("![](" + data.url + ")");
						onStatus("ok", "图片已上传");
					} else onStatus("error", data.error || "上传失败，请重试");
				}).catch((e) => {
					finish();
					onStatus("error", "上传失败：" + String(e?.message ?? e));
				});
			};
			const uploadFile = (file, onInsert) => {
				if (!file) return;
				if (!cookie) {
					onStatus("error", "请先一键登录后再上传图片");
					return;
				}
				if (file.size > 5242880) {
					onStatus("error", "图片不能超过 5MB");
					return;
				}
				if (uploading.current) return;
				uploading.current = true;
				onStatus("info", "图片上传中…");
				const type = file.type || "image/png";
				if (!isAllowedImageType(type)) {
					const reader = new FileReader();
					reader.onload = () => {
						const img = new Image();
						img.onload = () => {
							const canvas = document.createElement("canvas");
							canvas.width = img.naturalWidth;
							canvas.height = img.naturalHeight;
							const c2d = canvas.getContext("2d");
							if (c2d) c2d.drawImage(img, 0, 0);
							const png = canvas.toDataURL("image/png");
							uploadBase64(String(png).split(",")[1] || "", "image.png", "image/png", onInsert);
						};
						img.onerror = () => {
							finish();
							onStatus("error", "图片转码失败（浏览器不支持该格式），请改用 PNG/JPG");
						};
						img.src = String(reader.result || "");
					};
					reader.onerror = () => {
						finish();
						onStatus("error", "读取图片失败");
					};
					reader.readAsDataURL(file);
					return;
				}
				const reader = new FileReader();
				reader.onload = () => {
					uploadBase64(String(reader.result || "").split(",")[1] || "", file.name || "image.png", type, onInsert);
				};
				reader.onerror = () => {
					finish();
					onStatus("error", "读取图片失败");
				};
				reader.readAsDataURL(file);
			};
			const pickImage = (e) => {
				const dt = e.clipboardData;
				if (!dt) return null;
				if (dt.items && dt.items.length) for (let i = 0; i < dt.items.length; i++) {
					const it = dt.items[i];
					if (it.kind === "file") try {
						const f = it.getAsFile();
						if (f) return f;
					} catch {}
				}
				if (dt.files && dt.files.length) for (let i = 0; i < dt.files.length; i++) {
					const f = dt.files[i];
					if (f && f.type && f.type.indexOf("image/") === 0) return f;
				}
				return null;
			};
			const onPaste = (e, onInsert) => {
				const file = pickImage(e);
				if (file) {
					e.preventDefault();
					uploadFile(file, onInsert);
				} else onStatus("error", "未检测到剪贴板图片（请用截图工具复制图片后再粘贴）");
			};
			return {
				uploadFile,
				onPaste
			};
		}
		function insertAtCursor(ref, setValue, md) {
			const el = ref.current;
			const cur = el ? el.value : "";
			const start = el && el.selectionStart != null ? el.selectionStart : cur.length;
			const end = el && el.selectionEnd != null ? el.selectionEnd : cur.length;
			setValue(cur.slice(0, start) + md + cur.slice(end));
			if (el) {
				const pos = start + md.length;
				requestAnimationFrame(() => {
					try {
						el.focus();
						el.setSelectionRange(pos, pos);
					} catch {}
				});
			}
		}
		function PostDetail({ id, cookie, onBack }) {
			const [state, setState] = (0, react.useState)({
				loading: true,
				error: "",
				post: null,
				comments: []
			});
			const [reply, setReply] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [msg, setMsg] = (0, react.useState)("");
			const [msgKind, setMsgKind] = (0, react.useState)("");
			const replyRef = (0, react.useRef)(null);
			const img = useImageUpload(cookie, (kind, text) => {
				setMsgKind(kind);
				setMsg(text);
			});
			const load = () => {
				setState((s) => ({
					...s,
					loading: true,
					error: ""
				}));
				rpc("post", { id }).then((r) => {
					const data = r;
					if (data.ok) setState({
						loading: false,
						error: "",
						post: data.post,
						comments: data.comments || []
					});
					else setState((s) => ({
						...s,
						loading: false,
						error: data.error || "加载失败"
					}));
				});
			};
			(0, react.useEffect)(load, [id]);
			const vote = () => {
				if (!cookie) {
					setMsg("请先一键登录");
					return;
				}
				setBusy(true);
				setMsg("");
				rpc("vote", {
					cookie,
					postId: id
				}).then((r) => {
					setBusy(false);
					const data = r;
					if (data.ok) load();
					else setMsg(data.error || "点赞失败");
				});
			};
			const submitReply = () => {
				if (!cookie) {
					setMsg("请先一键登录");
					return;
				}
				if (!reply.trim()) {
					setMsg("回复不能为空");
					return;
				}
				setBusy(true);
				setMsg("");
				rpc("createComment", {
					cookie,
					postId: id,
					contentMd: reply
				}).then((r) => {
					setBusy(false);
					const data = r;
					if (data.ok) {
						setReply("");
						setMsg("已回复");
						load();
					} else setMsg(data.error || "回复失败");
				});
			};
			const s = state;
			const msgClass = msgKind === "ok" ? "dsb-ok" : msgKind === "info" ? "dsb-uploading" : "dsb-error";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "dsb-btn",
					onClick: onBack,
					children: "← 返回"
				}),
				s.loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsb-loading",
					children: "加载中…"
				}),
				s.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsb-error",
					children: s.error
				}),
				!s.loading && s.post && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-detail-title",
						children: s.post.title
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-detail-meta",
						children: `~/bbs/${s.post.category} · ${s.post.author} · ${fmtTime(s.post.time)} · ${s.post.views} 浏览`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-prose",
						dangerouslySetInnerHTML: { __html: s.post.contentHtml }
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							marginTop: 10,
							display: "flex",
							alignItems: "center",
							gap: 10
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dsb-btn",
							onClick: vote,
							disabled: busy,
							children: `${s.post.liked ? "♥" : "♡"} ${s.post.voteCount}`
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: "dsb-link",
							href: `https://bbs.dsher.cn/forum/post/${id}`,
							target: "_blank",
							rel: "noreferrer",
							children: "在论坛打开 ↗"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 14,
							fontWeight: 600
						},
						children: `回复（${s.comments.length}）`
					}),
					s.comments.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-empty",
						children: "还没有回复"
					}),
					s.comments.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsb-comment",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-comment-meta",
							children: `#${c.floor} · ${c.author} · ${fmtTime(c.time)}` + (c.parentName ? ` · ↳ @${c.parentName}` : "")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-prose",
							dangerouslySetInnerHTML: { __html: c.contentHtml }
						})]
					}, c.id)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { marginTop: 12 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: replyRef,
							className: "dsb-textarea",
							placeholder: "写下你的回复（支持 Markdown；可直接粘贴截图）…",
							value: reply,
							onChange: (e) => setReply(e.target.value),
							onPaste: (e) => img.onPaste(e, (md) => insertAtCursor(replyRef, setReply, md))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								marginTop: 6,
								display: "flex",
								gap: 8,
								alignItems: "center"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: "dsb-btn",
									onClick: () => {
										const input = document.createElement("input");
										input.type = "file";
										input.accept = "image/*";
										input.onchange = () => {
											if (input.files && input.files[0]) img.uploadFile(input.files[0], (md) => insertAtCursor(replyRef, setReply, md));
										};
										input.click();
									},
									children: "🖼 上传图片"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: "dsb-btn primary",
									onClick: submitReply,
									disabled: busy,
									children: "提交回复"
								}),
								msg && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: msgClass,
									style: { marginLeft: 4 },
									children: msg
								})
							]
						})]
					})
				] })
			] });
		}
		function BrowseView({ cookie, onOpenPost }) {
			const [view, setView] = (0, react.useState)("latest");
			const [cats, setCats] = (0, react.useState)(null);
			const [slug, setSlug] = (0, react.useState)("general");
			const [q, setQ] = (0, react.useState)("");
			const [searching, setSearching] = (0, react.useState)(false);
			const [state, setState] = (0, react.useState)({
				loading: true,
				error: "",
				threads: [],
				page: 1,
				totalPages: 1
			});
			const [searchState, setSearchState] = (0, react.useState)({
				done: false,
				loading: false,
				error: "",
				results: [],
				count: 0
			});
			const [latestState, setLatestState] = (0, react.useState)({
				loading: true,
				error: "",
				posts: []
			});
			(0, react.useEffect)(() => {
				rpc("categories").then((r) => {
					const data = r;
					if (data.ok && data.categories && data.categories.length) {
						setCats(data.categories);
						setSlug((s) => data.categories.some((c) => c.slug === s) ? s : data.categories[0].slug);
					}
				});
				rpc("latest").then((r) => {
					const data = r;
					if (data.ok) setLatestState({
						loading: false,
						error: "",
						posts: data.posts || []
					});
					else setLatestState((st) => ({
						...st,
						loading: false,
						error: data.error || "加载失败"
					}));
				});
			}, []);
			const loadThreads = (s) => {
				setState((st) => ({
					...st,
					loading: true,
					error: ""
				}));
				rpc("threads", {
					slug: s,
					page: 1
				}).then((r) => {
					const data = r;
					if (data.ok) setState({
						loading: false,
						error: "",
						threads: data.threads || [],
						page: data.page || 1,
						totalPages: data.totalPages || 1
					});
					else setState((st) => ({
						...st,
						loading: false,
						error: data.error || "加载失败"
					}));
				});
			};
			(0, react.useEffect)(() => {
				if (slug && !searching && view === "forum") loadThreads(slug);
			}, [
				slug,
				searching,
				view
			]);
			const goPage = (p) => {
				if (p < 1 || p > state.totalPages) return;
				setState((st) => ({
					...st,
					loading: true,
					error: ""
				}));
				rpc("threads", {
					slug,
					page: p
				}).then((r) => {
					const data = r;
					if (data.ok) setState({
						loading: false,
						error: "",
						threads: data.threads || [],
						page: data.page || 1,
						totalPages: data.totalPages || 1
					});
					else setState((st) => ({
						...st,
						loading: false,
						error: data.error || "加载失败"
					}));
				});
			};
			const runSearch = () => {
				if (!q.trim()) {
					setSearching(false);
					return;
				}
				setSearching(true);
				setSearchState((st) => ({
					...st,
					loading: true,
					error: "",
					done: false
				}));
				rpc("search", { q: q.trim() }).then((r) => {
					const data = r;
					if (data.ok) setSearchState({
						done: true,
						loading: false,
						error: "",
						results: data.results || [],
						count: data.count || 0
					});
					else setSearchState((st) => ({
						...st,
						loading: false,
						done: true,
						error: data.error || "搜索失败"
					}));
				});
			};
			const clearSearch = () => {
				setQ("");
				setSearching(false);
				setSearchState({
					done: false,
					loading: false,
					error: "",
					results: [],
					count: 0
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsb-viewtabs",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsb-viewtab" + (view === "latest" ? " active" : ""),
						onClick: () => setView("latest"),
						children: "最新讨论"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsb-viewtab" + (view === "forum" ? " active" : ""),
						onClick: () => setView("forum"),
						children: "版块"
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsb-searchbar",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dsb-input",
							placeholder: "搜索帖子标题…",
							value: q,
							onChange: (e) => setQ(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") runSearch();
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dsb-btn primary",
							onClick: runSearch,
							disabled: searchState.loading,
							children: "搜索"
						}),
						searching && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dsb-btn",
							onClick: clearSearch,
							children: "取消"
						})
					]
				}),
				searching ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					searchState.loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-loading",
						children: "搜索中…"
					}),
					searchState.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-error",
						children: searchState.error
					}),
					searchState.done && !searchState.loading && !searchState.error && searchState.results.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-empty",
						children: "没有找到相关帖子"
					}),
					searchState.results.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsb-row",
						onClick: () => onOpenPost(t.id),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-row-title",
							children: t.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-row-meta",
							children: `${t.author} · ${t.replyCount} 回复 · ${fmtTime(t.time)}`
						})]
					}, t.id))
				] }) : view === "latest" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					latestState.loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-loading",
						children: "加载最新讨论…"
					}),
					latestState.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-error",
						children: latestState.error
					}),
					!latestState.loading && !latestState.error && latestState.posts.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-empty",
						children: "还没有帖子，来发第一帖吧"
					}),
					latestState.posts.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsb-row",
						onClick: () => onOpenPost(t.id),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-row-title",
							children: t.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-row-meta",
							children: `~/bbs/${t.categorySlug} · ${t.author} · ${t.replyCount} 回复`
						})]
					}, t.id))
				] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					cats === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-loading",
						children: "加载版块…"
					}),
					cats && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-chips",
						children: cats.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsb-chip" + (c.slug === slug ? " active" : ""),
							onClick: () => setSlug(c.slug),
							children: c.name
						}, c.slug))
					}),
					state.loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-loading",
						children: "加载帖子…"
					}),
					state.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-error",
						children: state.error
					}),
					!state.loading && !state.error && state.threads.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-empty",
						children: "这个版块还没有帖子"
					}),
					state.threads.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsb-row",
						onClick: () => onOpenPost(t.id),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-row-title",
							children: (t.pinned ? "📌 " : "") + (t.starred ? "★ " : "") + t.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-row-meta",
							children: `${t.author} · ${t.replyCount} 回复 · ${fmtTime(t.time)}`
						})]
					}, t.id)),
					state.totalPages > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsb-pager",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsb-link",
								onClick: () => goPage(state.page - 1),
								children: "‹ 上一页"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: `${state.page} / ${state.totalPages}` }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsb-link",
								onClick: () => goPage(state.page + 1),
								children: "下一页 ›"
							})
						]
					})
				] })
			] });
		}
		function ComposeView({ cookie, onOpenPost }) {
			const [cats, setCats] = (0, react.useState)([]);
			const [slug, setSlug] = (0, react.useState)("general");
			const [title, setTitle] = (0, react.useState)("");
			const [content, setContent] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [msg, setMsg] = (0, react.useState)("");
			const [msgOk, setMsgOk] = (0, react.useState)(false);
			const contentRef = (0, react.useRef)(null);
			const img = useImageUpload(cookie, (kind, text) => {
				setMsgOk(kind === "ok");
				setMsg(text);
			});
			(0, react.useEffect)(() => {
				rpc("categories").then((r) => {
					const data = r;
					if (data.ok && data.categories && data.categories.length) {
						setCats(data.categories);
						setSlug((s) => data.categories.some((c) => c.slug === s) ? s : data.categories[0].slug);
					}
				});
			}, []);
			const submit = () => {
				if (!cookie) {
					setMsgOk(false);
					setMsg("请先一键登录");
					return;
				}
				if (!title.trim()) {
					setMsgOk(false);
					setMsg("标题不能为空");
					return;
				}
				if (!content.trim()) {
					setMsgOk(false);
					setMsg("内容不能为空");
					return;
				}
				setBusy(true);
				setMsg("");
				rpc("createPost", {
					cookie,
					categorySlug: slug,
					title: title.trim(),
					contentMd: content.trim()
				}).then((r) => {
					setBusy(false);
					const data = r;
					if (data.ok) {
						setMsgOk(true);
						setMsg(`发帖成功${data.postId ? "（帖子 #" + data.postId + "）" : ""}`);
						setTitle("");
						setContent("");
						if (data.postId) onOpenPost(data.postId);
					} else {
						setMsgOk(false);
						setMsg(data.error || "发帖失败");
					}
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				cats.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { marginBottom: 8 },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						className: "dsb-select",
						value: slug,
						onChange: (e) => setSlug(e.target.value),
						children: cats.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: c.slug,
							children: c.name
						}, c.slug))
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: "dsb-input",
					placeholder: "标题（≤120 字）",
					value: title,
					onChange: (e) => setTitle(e.target.value),
					style: { marginBottom: 8 }
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					ref: contentRef,
					className: "dsb-textarea",
					placeholder: "正文（支持 Markdown，≤10000 字；可直接粘贴截图）…",
					value: content,
					onChange: (e) => setContent(e.target.value),
					onPaste: (e) => img.onPaste(e, (md) => insertAtCursor(contentRef, setContent, md))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						marginTop: 8,
						display: "flex",
						gap: 8,
						alignItems: "center"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dsb-btn",
							onClick: () => {
								const input = document.createElement("input");
								input.type = "file";
								input.accept = "image/*";
								input.onchange = () => {
									if (input.files && input.files[0]) img.uploadFile(input.files[0], (md) => insertAtCursor(contentRef, setContent, md));
								};
								input.click();
							},
							children: "🖼 上传图片"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dsb-btn primary",
							onClick: submit,
							disabled: busy,
							children: busy ? "发布中…" : "发布帖子"
						}),
						msg && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: msgOk ? "dsb-ok" : "dsb-error",
							style: { marginLeft: 4 },
							children: msg
						})
					]
				})
			] });
		}
		function BbsPanel() {
			useInjectStyles();
			const open = useOpen();
			const [tab, setTab] = (0, react.useState)("browse");
			const [cookie, setCookie] = (0, react.useState)("");
			const [user, setUser] = (0, react.useState)(null);
			const [detailId, setDetailId] = (0, react.useState)(null);
			const [checking, setChecking] = (0, react.useState)(false);
			const [checkMsg, setCheckMsg] = (0, react.useState)("");
			const [showManual, setShowManual] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				const onMsg = (e) => {
					const d = e.data;
					if (d && d.type === "dsh-bbs-session" && d.cookie) {
						setCookie(d.cookie);
						setCheckMsg("已通过一键登录接入");
						rpc("me", { cookie: d.cookie }).then((r) => {
							const data = r;
							if (data.ok && data.user) setUser(data.user);
						});
					}
				};
				window.addEventListener("message", onMsg);
				return () => window.removeEventListener("message", onMsg);
			}, []);
			if (!open) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				className: "dsb-fab",
				type: "button",
				title: "dsher 社区（bbs.dsher.cn）",
				"aria-label": "打开 dsher 社区面板",
				onClick: () => setOpen(true),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "dsher 社区" })
			});
			const verify = () => {
				if (!cookie.trim()) {
					setCheckMsg("Cookie 为空");
					return;
				}
				setChecking(true);
				setCheckMsg("");
				rpc("me", { cookie }).then((r) => {
					setChecking(false);
					const data = r;
					if (data.ok) {
						if (data.user) {
							setUser(data.user);
							setCheckMsg("已登录：" + data.user.name);
						} else {
							setUser(null);
							setCheckMsg("Cookie 无效或已过期");
						}
					} else setCheckMsg(data.error || "验证失败");
				});
			};
			const logout = () => {
				setCookie("");
				setUser(null);
				setCheckMsg("");
			};
			const openPost = (id) => {
				setDetailId(id);
			};
			const back = () => {
				setDetailId(null);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsb-overlay",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsb-head",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								className: "dsb-logo",
								src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAYAAADlNHIOAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAALcSURBVHhe7ZxtbtwwDIb9/0d3YKBAA3v/J0vA0G1oYyf2SWKfF1r9SEvi4I8ULSVVhReLxWKxWQwAAP8jAABAAAUU8AcFAMBfFIA/KAChB4UK0R+9SAP3IB7hJj6JK3QNDbgH8Qj28TJuUngJDfdC0Cpc4t7EHfoGHOQehDvcTdxCwx1Bq6BL3IDncIR7EA9xP27oFmY0hO6e9nFXblCeDcO7qL+/W1yDnYA0UjFHzhhJSASkEAtSCEVFnI+BREgyCVJyq6KmI/1rJDQXi0gJCSJOySAzS5CRQ3n2bciqg2cwNxwq6koJjKJMSWItn2T6GEb6lR5hXUw5q4JJxE7kOaXSMm7sqR0IhVpBFWZBIUqgqFEWgWQQJUYYqRF1KDcw14Qjcyixwq6UGp1h0MUKvRF3oQB1rCY0SCyRI1qQJfRU0smyGlCHKsXmKMnWkM9RIlTMWFQqWKWl4F1opWJihd2dWShNMrCJ3aF3X1c+BhQZCwyyUcGtTKjGVUgrlGgphlVmZklxGrLc3KBq6J9HqZw4oVdRwhgKbSHTqhOeUYJLXV7jH6MY6CQdXw2Yk8A3dQv2cV9uUJ4Nw7uov79bXIOdgDRSpmBN3EF23uECcn8SV+jBPYh3sI+XcZPCS2i4F4JW4RL3Ju7QN+Ag9yDc4W7iFhruCFoFXeIGPIcj3IN4iPtxQ7cwoyF097SPu3KD8mwY3kV9/d3iGuwEpJ2KOWLGSCOAhFggJRZUxPkYSCSkmCQlt0rUpKf+NRIaC0lICEniKpICJUmKUmJ9TqTbgywcmUkghVRcKTq2QpaQcYJgNFhGVJg8FV1CSc9SEnkHCyCBFMlqKCaCLRBhlmLKxkJYRW2KqIYVooTVUUu4GauMEudJhTEls4SQ1oQ3tYTsoENHSUuZGWlxRlBZcA3ZSpZSyLphHCxJlZ6lDylBxmCK11F1KWYpi3qYRZDCqimZYaoN6cKJZ3FLlZlglcJVXFOUiDN1Z9qHlTCl0ot6xHPYk7iFTZCRt3sSd+gZcJB7EO5wN3ELDXcErYIucQOewxHuQTzE/bihW5jREA==",
								alt: "bbs.dsher.cn"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsb-head-title",
								children: "dsh 社区"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsb-head-sub",
								children: "bbs.dsher.cn"
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsb-spacer" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: "dsb-link",
								href: "https://bbs.dsher.cn",
								target: "_blank",
								rel: "noreferrer",
								style: { fontSize: 12 },
								children: "打开 ↗"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dsb-btn",
								onClick: () => setOpen(false),
								style: { padding: "2px 8px" },
								children: "✕"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-auth",
						children: !cookie ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsb-auth-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: "dsb-btn",
									onClick: () => openLogin("github"),
									children: "🔑 一键登录 (GitHub)"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: "dsb-btn",
									onClick: () => openLogin("google"),
									children: "🔑 一键登录 (Google)"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsb-hint",
								children: "点按后在弹出的论坛登录页选择通道完成 OAuth，会话自动接入；无需复制 Cookie。"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsb-link",
								style: { fontSize: 11 },
								onClick: () => setShowManual(!showManual),
								children: showManual ? "收起手动方式 ▴" : "手动粘贴 Cookie ▾"
							}),
							showManual && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { marginTop: 6 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsb-auth-row",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "dsb-input",
										type: "password",
										placeholder: "会话 Cookie（备用方式）",
										value: cookie,
										onChange: (e) => {
											setCookie(e.target.value);
											setUser(null);
											setCheckMsg("");
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "dsb-btn",
										onClick: verify,
										disabled: checking,
										children: checking ? "验证中…" : "验证"
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsb-hint",
									children: "登录 bbs.dsher.cn → 开发者工具 → Cookies，复制 better-auth.session_token 的值（含 __Secure- 前缀则一起复制）。"
								})]
							})
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsb-auth-row",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsb-ok",
									style: { margin: 0 },
									children: "✓ 已登录" + (user ? "：" + user.name : "")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsb-spacer" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: "dsb-btn",
									onClick: logout,
									children: "退出"
								})
							]
						}), checkMsg && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-hint",
							style: { marginTop: 4 },
							children: checkMsg
						})] })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsb-tabs",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-tab" + (tab === "browse" ? " active" : ""),
							onClick: () => {
								setTab("browse");
								setDetailId(null);
							},
							children: "浏览"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsb-tab" + (tab === "compose" ? " active" : ""),
							onClick: () => {
								setTab("compose");
								setDetailId(null);
							},
							children: "发帖"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsb-body",
						children: detailId !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PostDetail, {
							id: detailId,
							cookie,
							onBack: back
						}) : tab === "browse" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrowseView, {
							cookie,
							onOpenPost: openPost
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComposeView, {
							cookie,
							onOpenPost: openPost
						})
					})
				]
			});
		}
		//#endregion
		module.exports = {
			name: "dsher-bbs-plugin/client",
			apply(ctx) {
				ctx.inject(["slots"], (scope) => {
					const slots = scope.get("slots");
					slots.inject("shell.overlay", () => slots.register({
						name: "shell.overlay",
						id: "dsher-bbs-panel"
					}, () => (0, react.createElement)(BbsPanel)));
				});
			}
		};
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map