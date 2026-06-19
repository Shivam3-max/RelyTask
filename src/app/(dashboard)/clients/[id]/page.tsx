import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientDetail } from "./ClientDetail";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        include: {
          tasks: {
            select: { id: true, status: true, dueDate: true },
          },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      adAccounts: {
        include: {
          metrics: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!client) notFound();

  return <ClientDetail client={client as any} />;
}
