import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 422 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Remove any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    if (process.env.SMTP_HOST) {
      const mailer = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await mailer
        .sendMail({
          from: `"RELYTASK SOPs" <${process.env.SMTP_FROM}>`,
          to: email,
          subject: "Reset your RELYTASK password",
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#6366f1">RELYTASK SOPs</h2>
              <h3>Reset your password</h3>
              <p>Click the link below to set a new password. This link expires in <strong>1 hour</strong>.</p>
              <a href="${resetUrl}"
                 style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px">
                Reset Password
              </a>
              <p style="margin-top:20px;color:#6b7280;font-size:12px">
                If you didn't request this, ignore this email — your password won't change.
              </p>
            </div>`,
        })
        .catch(console.error);
    } else {
      // Development fallback — log the link so it can be tested without SMTP
      console.log(`[DEV] Password reset link for ${email}:\n${resetUrl}`);
    }
  }

  // Always return the same response to prevent email enumeration
  return NextResponse.json({
    message: "If that email is registered you'll receive a reset link shortly.",
  });
}
