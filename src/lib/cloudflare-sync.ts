export type AssetSource = "dns" | "tunnel";

export type DiscoveredAsset = {
  hostname: string;
  rootDomain: string;
  sources: AssetSource[];
  dnsRecordType?: string;
  dnsValue?: string;
  proxied?: boolean;
  ttl?: number;
  tunnelId?: string;
  tunnelName?: string;
  tunnelService?: string;
};

export type PublicAsset = {
  displayName: string;
  hostname: string;
  url: string;
  description: string;
  category: string;
  icon: string;
};

type CloudflareZone = {
  id: string;
  name: string;
};

type CloudflareDnsRecord = {
  name: string;
  type: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
};

type CloudflareTunnel = {
  id: string;
  name: string;
};

type CloudflareListResponse<T> = {
  success: boolean;
  result: T[];
  errors?: unknown[];
};

type CloudflareObjectResponse<T> = {
  success: boolean;
  result: T;
  errors?: unknown[];
};

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

export function normalizeAllowedRootDomains(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : (value ?? "").split(",");
  return Array.from(
    new Set(
      raw
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function findMatchingRootDomain(hostname: string, allowedRootDomains: string[]): string | null {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/\.$/, "");
  return (
    allowedRootDomains.find(
      (rootDomain) =>
        normalizedHostname === rootDomain || normalizedHostname.endsWith(`.${rootDomain}`),
    ) ?? null
  );
}

export function filterAssetsByAllowedDomains(
  assets: DiscoveredAsset[],
  allowedRootDomains: string[],
): DiscoveredAsset[] {
  return assets
    .map((asset) => {
      const hostname = asset.hostname.trim().toLowerCase().replace(/\.$/, "");
      const rootDomain = findMatchingRootDomain(hostname, allowedRootDomains);
      return rootDomain ? { ...asset, hostname, rootDomain } : null;
    })
    .filter((asset): asset is DiscoveredAsset => asset !== null);
}

export function mergeDiscoveredAssets(assets: DiscoveredAsset[]): DiscoveredAsset[] {
  const byHostname = new Map<string, DiscoveredAsset>();

  for (const asset of assets) {
    const existing = byHostname.get(asset.hostname);
    if (!existing) {
      byHostname.set(asset.hostname, { ...asset, sources: uniqueSources(asset.sources) });
      continue;
    }

    byHostname.set(asset.hostname, {
      ...existing,
      ...dropUndefined(asset),
      sources: uniqueSources([...existing.sources, ...asset.sources]),
    });
  }

  return Array.from(byHostname.values()).sort((a, b) => a.hostname.localeCompare(b.hostname));
}

export function extractTunnelHostnames(
  config: unknown,
  options: { tunnelId: string; tunnelName: string; allowedRootDomains: string[] },
): DiscoveredAsset[] {
  const ingress = getIngressRules(config);
  const assets: DiscoveredAsset[] = [];

  for (const rule of ingress) {
    if (!rule || typeof rule !== "object") continue;
    const hostname = getStringProperty(rule, "hostname")?.toLowerCase();
    const service = getStringProperty(rule, "service");
    if (!hostname || !service) continue;

    const rootDomain = findMatchingRootDomain(hostname, options.allowedRootDomains);
    if (!rootDomain) continue;

    assets.push({
      hostname,
      rootDomain,
      sources: ["tunnel"],
      tunnelId: options.tunnelId,
      tunnelName: options.tunnelName,
      tunnelService: service,
    });
  }

  return assets;
}

export function toPublicAsset(asset: {
  hostname: string;
  profile?: {
    displayName?: string | null;
    description?: string | null;
    category?: string | null;
    icon?: string | null;
  } | null;
  dnsValue?: string | null;
  tunnelService?: string | null;
}): PublicAsset {
  return {
    displayName: asset.profile?.displayName || asset.hostname,
    hostname: asset.hostname,
    url: `https://${asset.hostname}`,
    description: asset.profile?.description || "",
    category: asset.profile?.category || "其他",
    icon: asset.profile?.icon || "",
  };
}

export async function fetchCloudflareAssets(options: {
  accountId: string;
  apiToken: string;
  allowedRootDomains: string[];
  fetchImpl?: typeof fetch;
}): Promise<DiscoveredAsset[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const allowedRootDomains = normalizeAllowedRootDomains(options.allowedRootDomains);
  const zones = await cloudflareList<CloudflareZone>(
    `/zones?per_page=100`,
    options.apiToken,
    fetchImpl,
  );
  const allowedZones = zones.filter((zone) => allowedRootDomains.includes(zone.name.toLowerCase()));
  const discovered: DiscoveredAsset[] = [];

  for (const zone of allowedZones) {
    const dnsRecords = await cloudflareList<CloudflareDnsRecord>(
      `/zones/${zone.id}/dns_records?per_page=500`,
      options.apiToken,
      fetchImpl,
    );
    for (const record of dnsRecords) {
      discovered.push({
        hostname: record.name.toLowerCase(),
        rootDomain: zone.name.toLowerCase(),
        sources: ["dns"],
        dnsRecordType: record.type,
        dnsValue: record.content,
        proxied: record.proxied,
        ttl: record.ttl,
      });
    }
  }

  const tunnels = await cloudflareList<CloudflareTunnel>(
    `/accounts/${options.accountId}/cfd_tunnel?per_page=100`,
    options.apiToken,
    fetchImpl,
  );
  for (const tunnel of tunnels) {
    const config = await cloudflareObject<unknown>(
      `/accounts/${options.accountId}/cfd_tunnel/${tunnel.id}/configurations`,
      options.apiToken,
      fetchImpl,
    );
    discovered.push(
      ...extractTunnelHostnames(config, {
        tunnelId: tunnel.id,
        tunnelName: tunnel.name,
        allowedRootDomains,
      }),
    );
  }

  return mergeDiscoveredAssets(filterAssetsByAllowedDomains(discovered, allowedRootDomains));
}

async function cloudflareList<T>(
  path: string,
  apiToken: string,
  fetchImpl: typeof fetch,
): Promise<T[]> {
  const response = await cloudflareRequest<CloudflareListResponse<T>>(path, apiToken, fetchImpl);
  return response.result ?? [];
}

async function cloudflareObject<T>(
  path: string,
  apiToken: string,
  fetchImpl: typeof fetch,
): Promise<T> {
  const response = await cloudflareRequest<CloudflareObjectResponse<T>>(path, apiToken, fetchImpl);
  return response.result;
}

async function cloudflareRequest<T>(
  path: string,
  apiToken: string,
  fetchImpl: typeof fetch,
): Promise<T> {
  const response = await fetchImpl(`${CLOUDFLARE_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare API request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { success?: boolean; errors?: unknown[] };
  if (payload.success === false) {
    throw new Error(`Cloudflare API returned errors: ${JSON.stringify(payload.errors ?? [])}`);
  }
  return payload as T;
}

function uniqueSources(sources: AssetSource[]): AssetSource[] {
  return Array.from(new Set(sources)).sort();
}

function dropUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

function getIngressRules(config: unknown): unknown[] {
  if (!config || typeof config !== "object") return [];
  const maybeConfig = "config" in config ? (config as { config?: unknown }).config : config;
  if (!maybeConfig || typeof maybeConfig !== "object") return [];
  const ingress = (maybeConfig as { ingress?: unknown }).ingress;
  return Array.isArray(ingress) ? ingress : [];
}

function getStringProperty(value: object, key: string): string | undefined {
  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === "string" ? entry : undefined;
}
