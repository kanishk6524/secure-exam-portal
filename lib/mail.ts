import nodemailer, { type Transporter } from "nodemailer"

let transporterPromise: Promise<Transporter> | undefined

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = process.env.SMTP_HOST
      ? Promise.resolve(
          nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: Number(process.env.SMTP_PORT ?? 587) === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          })
        )
      : nodemailer.createTestAccount().then((account) =>
          nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass },
          })
        )
  }
  return transporterPromise
}

type VerificationUser = {
  email: string
  fullName: string
  verificationToken: string | null
}

export async function sendVerificationEmail(user: VerificationUser) {
  const transporter = await getTransporter()
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify-email?token=${encodeURIComponent(user.verificationToken ?? "")}`
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Exam Platform <no-reply@example.com>",
    to: user.email,
    subject: "Verify your Exam Platform email",
    text: `Hi ${user.fullName}, verify your email here: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Verify your email</h2><p>Hi ${user.fullName},</p><p>Confirm your Exam Platform account by clicking the button below.</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p><p>This link expires in 24 hours.</p></div>`,
  })
  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) console.info(`Ethereal preview URL: ${previewUrl}`)
}

export async function sendPasswordResetEmail(email: string, fullName: string, token: string) {
  const transporter = await getTransporter()
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${encodeURIComponent(token)}`
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Exam Platform <no-reply@example.com>",
    to: email,
    subject: "Reset your Exam Platform password",
    text: `Hi ${fullName}, reset your password here: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Reset your password</h2><p>Hi ${fullName},</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p>This link expires in 24 hours.</p></div>`,
  })
  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) console.info(`Ethereal preview URL: ${previewUrl}`)
}