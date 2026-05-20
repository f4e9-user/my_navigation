"use client";

import { useMemo, useState } from "react";

export type PublicAssetCard = {
  displayName: string;
  hostname: string;
  url: string;
  description: string;
  category: string;
  icon: string;
};

const DEFAULT_CATEGORIES = ["全部", "生产系统", "测试系统", "运维工具", "文档", "其他"];

export function NavigationPage({ assets }: { assets: PublicAssetCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const categories = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORIES, ...assets.map((asset) => asset.category)])),
    [assets],
  );
  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = category === "全部" || asset.category === category;
    const lowerQuery = query.trim().toLowerCase();
    const matchesQuery =
      !lowerQuery ||
      [asset.displayName, asset.hostname, asset.description, asset.category]
        .join(" ")
        .toLowerCase()
        .includes(lowerQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/40">
          <p className="mb-3 text-sm font-medium text-cyan-300">Cloudflare 自动同步 · 安全导航</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">系统入口导航站</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            这里只展示管理员确认公开的系统名称、子域名和访问入口；Cloudflare Token、DNS 目标、Tunnel Service、内部端口和同步日志不会出现在前端。
          </p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索系统名称、子域名、分类..."
            className="mt-8 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-4 text-base outline-none ring-cyan-400/40 transition focus:ring-4"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                category === item
                  ? "bg-cyan-400 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {filteredAssets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center text-slate-400">
            暂无可见系统。请在后台同步 Cloudflare 资产后，将需要公开的入口设为可见。
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredAssets.map((asset) => (
              <article key={asset.hostname} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/20">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-cyan-300">{asset.category || "其他"}</p>
                    <h2 className="mt-1 text-xl font-semibold">{asset.displayName}</h2>
                  </div>
                  <span className="rounded-2xl bg-white/10 px-3 py-2 text-lg">{asset.icon || "↗"}</span>
                </div>
                <p className="break-all font-mono text-sm text-slate-300">{asset.hostname}</p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">{asset.description || "暂无说明"}</p>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  访问系统
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
