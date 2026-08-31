import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";

const metricSchema = z.object({
  date: z.string().datetime({ offset: true }),
  spend: z.number().nonnegative().max(10_000_000),
  impressions: z.number().int().nonnegative().max(1_000_000_000),
  clicks: z.number().int().nonnegative().max(100_000_000),
  conversions: z.number().int().nonnegative().max(10_000_000),
  roas: z.number().nonnegative().optional().nullable(),
  ctr: z.number().nonnegative().max(100).optional().nullable(),
  cpc: z.number().nonnegative().optional().nullable(),
  // One of these two must be provided
  adAccountId: z.string().optional(),
  clientId: z.string().optional(),
  platform: z.enum(["META", "GOOGLE", "YOUTUBE"]).optional(),
  accountName: z.string().max(200).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "ads", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const metrics = await prisma.adMetric.findMany({
    include: { adAccount: { include: { client: { select: { name: true } } } } },
    orderBy: { date: "desc" },
    take: 100,
  });
  return NextResponse.json(metrics);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "ads", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = metricSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { date, spend, impressions, clicks, conversions, roas, ctr, cpc } = parsed.data;

  // Resolve ad account
  let accountId = parsed.data.adAccountId;
  if (!accountId && parsed.data.clientId && parsed.data.platform) {
    const existing = await prisma.adAccount.findFirst({
      where: { clientId: parsed.data.clientId, platform: parsed.data.platform },
    });
    if (existing) {
      accountId = existing.id;
    } else {
      const account = await prisma.adAccount.create({
        data: {
          clientId: parsed.data.clientId,
          platform: parsed.data.platform,
          accountId: `manual-${Date.now()}`,
          accountName: parsed.data.accountName ?? `${parsed.data.platform} (Manual)`,
          accessToken: "manual",
        },
      });
      accountId = account.id;
    }
  }

  if (!accountId) {
    return NextResponse.json({ error: "Either adAccountId or clientId+platform is required" }, { status: 400 });
  }

  const metric = await prisma.adMetric.create({
    data: { adAccountId: accountId, date: new Date(date), spend, impressions, clicks, conversions, roas, ctr, cpc },
    include: { adAccount: { include: { client: { select: { name: true } } } } },
  });

  return NextResponse.json(metric, { status: 201 });
}
