import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(80).optional(),
  icon: z.string().trim().max(120).optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = profileSchema.parse(await request.json());
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id } });
  const profile = await prisma.assetProfile.upsert({
    where: { assetId: asset.id },
    create: {
      assetId: asset.id,
      displayName: body.displayName ?? asset.hostname,
      description: body.description,
      category: body.category ?? "其他",
      icon: body.icon,
      sortOrder: body.sortOrder ?? 0,
      isVisible: body.isVisible ?? false,
    },
    update: body,
  });

  return NextResponse.json(profile);
}
