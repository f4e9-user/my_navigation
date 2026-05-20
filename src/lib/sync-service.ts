import { prisma } from "./prisma";
import { fetchCloudflareAssets, normalizeAllowedRootDomains, type DiscoveredAsset } from "./cloudflare-sync";

export type SyncResult = {
  discovered: number;
  upserted: number;
  removed: number;
};

export function getCloudflareSyncConfig(env = process.env) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const allowedRootDomains = normalizeAllowedRootDomains(env.ALLOWED_ROOT_DOMAINS);

  if (!accountId) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID");
  if (!apiToken) throw new Error("Missing CLOUDFLARE_API_TOKEN");
  if (allowedRootDomains.length === 0) throw new Error("Missing ALLOWED_ROOT_DOMAINS");

  return { accountId, apiToken, allowedRootDomains };
}

export async function syncCloudflareAssets(fetchImpl?: typeof fetch): Promise<SyncResult> {
  const config = getCloudflareSyncConfig();
  const discovered = await fetchCloudflareAssets({ ...config, fetchImpl });
  return persistDiscoveredAssets(discovered);
}

export async function persistDiscoveredAssets(discovered: DiscoveredAsset[]): Promise<SyncResult> {
  const now = new Date();
  const seenHostnames = new Set(discovered.map((asset) => asset.hostname));
  let upserted = 0;

  for (const asset of discovered) {
    const existing = await prisma.asset.findUnique({ where: { hostname: asset.hostname } });
    await prisma.asset.upsert({
      where: { hostname: asset.hostname },
      create: {
        hostname: asset.hostname,
        rootDomain: asset.rootDomain,
        sources: asset.sources.join(","),
        dnsRecordType: asset.dnsRecordType,
        dnsValue: asset.dnsValue,
        proxied: asset.proxied,
        ttl: asset.ttl,
        tunnelId: asset.tunnelId,
        tunnelName: asset.tunnelName,
        tunnelService: asset.tunnelService,
        lastSyncedAt: now,
        profile: {
          create: {
            displayName: asset.hostname,
            category: "其他",
            isVisible: false,
          },
        },
      },
      update: {
        rootDomain: asset.rootDomain,
        sources: asset.sources.join(","),
        dnsRecordType: asset.dnsRecordType ?? null,
        dnsValue: asset.dnsValue ?? null,
        proxied: asset.proxied ?? null,
        ttl: asset.ttl ?? null,
        tunnelId: asset.tunnelId ?? null,
        tunnelName: asset.tunnelName ?? null,
        tunnelService: asset.tunnelService ?? null,
        lastSyncedAt: now,
        removedAt: null,
      },
    });
    if (!existing) {
      await prisma.assetProfile.upsert({
        where: { assetId: (await prisma.asset.findUniqueOrThrow({ where: { hostname: asset.hostname } })).id },
        create: {
          assetId: (await prisma.asset.findUniqueOrThrow({ where: { hostname: asset.hostname } })).id,
          displayName: asset.hostname,
          category: "其他",
          isVisible: false,
        },
        update: {},
      });
    }
    upserted += 1;
  }

  const stale = await prisma.asset.findMany({
    where: {
      removedAt: null,
      hostname: { notIn: Array.from(seenHostnames) },
    },
    select: { id: true },
  });

  if (stale.length > 0) {
    await prisma.asset.updateMany({
      where: { id: { in: stale.map((asset) => asset.id) } },
      data: { removedAt: now },
    });
  }

  return { discovered: discovered.length, upserted, removed: stale.length };
}
