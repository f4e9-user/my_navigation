import { prisma } from "@/lib/prisma";
import { toPublicAsset } from "@/lib/cloudflare-sync";
import { NavigationPage } from "@/components/navigation-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const assets = await prisma.asset.findMany({
    where: {
      removedAt: null,
      profile: { isVisible: true },
    },
    include: { profile: true },
    orderBy: [{ profile: { sortOrder: "asc" } }, { hostname: "asc" }],
  });

  return <NavigationPage assets={assets.map(toPublicAsset)} />;
}
