import { Resend } from "resend"

let resendClient: Resend | undefined

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set. Add it to .env.local (get one at https://resend.com/api-keys).")
  }
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

const FROM = process.env.RESEND_FROM ?? "Exam Platform <onboarding@resend.dev>"

type VerificationUser = {
  email: string
  fullName: string
  verificationToken: string | null
}

export async function sendVerificationEmail(user: VerificationUser) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify-email?token=${encodeURIComponent(user.verificationToken ?? "")}`
  const { error } = await getClient().emails.send({
    from: FROM,
    to: user.email,
    subject: "Verify your Exam Platform email",
    text: `Hi ${user.fullName}, verify your email here: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Verify your email</h2><p>Hi ${user.fullName},</p><p>Confirm your Exam Platform account by clicking the button below.</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p><p>This link expires in 24 hours.</p></div>`,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

export async function sendPasswordResetEmail(email: string, fullName: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${encodeURIComponent(token)}`
  const { error } = await getClient().emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Exam Platform password",
    text: `Hi ${fullName}, reset your password here: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Reset your password</h2><p>Hi ${fullName},</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p>This link expires in 24 hours.</p></div>`,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}
