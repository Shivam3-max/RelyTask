import nodemailer from "nodemailer";
import twilio from "twilio";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendNotification({
  userId,
  title,
  body,
  type,
  metadata,
}: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // Save in-app notification
  await prisma.notification.create({
    data: { userId, title, body, type, metadata: metadata as Prisma.InputJsonValue | undefined },
  });

  // Email and WhatsApp are best-effort side channels — deliberately not
  // awaited. The in-app notification above is what the UI actually depends
  // on; blocking the request on an external mail/SMS provider means a slow
  // or unreachable SMTP host (or, locally, the placeholder .env credentials)
  // stalls every task action that happens to notify someone.

  // Email — only send if SMTP is configured
  if (process.env.SMTP_HOST && user.email) {
    const mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    const safeTitle = escapeHtml(title);
    const safeBody = escapeHtml(body);
    void mailer.sendMail({
      from: `"RELYTASK SOPs" <${process.env.SMTP_FROM}>`,
      to: user.email,
      subject: title,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6366f1">RELYTASK SOPs</h2>
        <h3>${safeTitle}</h3>
        <p>${safeBody}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px">
          Open Dashboard
        </a>
      </div>`,
    }).catch(console.error);
  }

  // WhatsApp via Twilio — only send if all credentials are configured
  if (
    user.phone &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  ) {
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    void twilioClient.messages
      .create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        to: `whatsapp:${user.phone}`,
        body: `*${title}*\n${body}\n\nOpen: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      })
      .catch(console.error);
  }
}
