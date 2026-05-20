import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  const assets = await prisma.asset.findMany({
    include: { profile: true },
    orderBy: [{ hostname: "asc" }],
  });

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Admin Page</p>
            <h1 className="text-3xl font-bold">Cloudflare 资产管理</h1>
            <p className="mt-2 text-slate-600">新发现资产默认不公开。请设置展示信息并确认 is_visible 后，才会出现在首页。</p>
          </div>
          <form action="/api/admin/sync/cloudflare" method="post">
            <button className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white">手动同步</button>
          </form>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="p-4">Hostname</th>
                <th className="p-4">来源</th>
                <th className="p-4">展示名</th>
                <th className="p-4">分类</th>
                <th className="p-4">可见</th>
                <th className="p-4">DNS</th>
                <th className="p-4">Tunnel</th>
                <th className="p-4">最后同步</th>
                <th className="p-4">Removed</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="p-4 font-mono">{asset.hostname}</td>
                  <td className="p-4">{asset.sources}</td>
                  <td className="p-4">{asset.profile?.displayName || "-"}</td>
                  <td className="p-4">{asset.profile?.category || "其他"}</td>
                  <td className="p-4">{asset.profile?.isVisible ? "是" : "否"}</td>
                  <td className="p-4 text-slate-600">{asset.dnsRecordType || "-"} {asset.proxied === null ? "" : asset.proxied ? "proxied" : "dns-only"}</td>
                  <td className="p-4 text-slate-600">{asset.tunnelName || "-"}</td>
                  <td className="p-4 text-slate-600">{asset.lastSyncedAt.toISOString()}</td>
                  <td className="p-4 text-slate-600">{asset.removedAt?.toISOString() || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-6 text-sm leading-6 text-slate-600">
          <p className="font-semibold text-slate-950">更新展示信息 API：</p>
          <code className="mt-2 block rounded-2xl bg-slate-100 p-4">PATCH /api/admin/assets/:id/profile</code>
          <p className="mt-3">Body 支持 displayName、description、category、icon、sortOrder、isVisible。</p>
        </div>
      </section>
    </main>
  );
}
