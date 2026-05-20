import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncCloudflareAssets } from "@/lib/sync-service";

export async function POST() {
  const result = await syncCloudflareAssets();
  return NextResponse.json(result);
}

export async function GET() {
  const assets = await prisma.asset.findMany({
    include: { profile: true },
    orderBy: [{ hostname: "asc" }],
  });
  return NextResponse.json(
    assets.map((asset) => ({
      id: asset.id,
      hostname: asset.hostname,
      rootDomain: asset.rootDomain,
      sources: asset.sources.split(","),
      dnsRecordType: asset.dnsRecordType,
      proxied: asset.proxied,
      tunnelName: asset.tunnelName,
      tunnelService: asset.tunnelService ? maskInternalValue(asset.tunnelService) : null,
      lastSyncedAt: asset.lastSyncedAt,
      removedAt: asset.removedAt,
      profile: asset.profile,
    })),
  );
}

function maskInternalValue(value: string) {
  if (value.length <= 10) return "••••";
  return `${value.slice(0, 6)}••••${value.slice(-4)}`;
}
