import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const body = await req.json();
  const { date, spend, impressions, clicks, conversions, roas, ctr, cpc } = body;

  // Auto-create or find ad account
  let accountId = body.adAccountId;
  if (!accountId && body.clientId && body.platform) {
    const existing = await prisma.adAccount.findFirst({
      where: { clientId: body.clientId, platform: body.platform },
    });
    if (existing) {
      accountId = existing.id;
    } else {
      const account = await prisma.adAccount.create({
        data: {
          clientId: body.clientId,
          platform: body.platform,
          accountId: `manual-${Date.now()}`,
          accountName: `${body.platform} (Manual)`,
          accessToken: "manual",
        },
      });
      accountId = account.id;
    }
  }

  const metric = await prisma.adMetric.create({
    data: {
      adAccountId: accountId,
      date: new Date(date),
      spend: parseFloat(spend),
      impressions: parseInt(impressions),
      clicks: parseInt(clicks),
      conversions: parseInt(conversions),
      roas: roas ? parseFloat(roas) : null,
      ctr: ctr ? parseFloat(ctr) : null,
      cpc: cpc ? parseFloat(cpc) : null,
    },
    include: { adAccount: { include: { client: { select: { name: true } } } } },
  });

  return NextResponse.json(metric, { status: 201 });
}
