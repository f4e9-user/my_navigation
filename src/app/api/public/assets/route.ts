import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicAsset } from "@/lib/cloudflare-sync";

export async function GET() {
  const assets = await prisma.asset.findMany({
    where: {
      removedAt: null,
      profile: { isVisible: true },
    },
    include: { profile: true },
    orderBy: [{ profile: { sortOrder: "asc" } }, { hostname: "asc" }],
  });

  return NextResponse.json(assets.map(toPublicAsset));
}
