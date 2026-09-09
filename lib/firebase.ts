const IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v1"

function apiKey() {
  const key = process.env.FIREBASE_API_KEY
  if (!key) throw new Error("FIREBASE_API_KEY is not set. Add it to .env.local (Firebase console → Project settings → Web API Key).")
  return key
}

const FRIENDLY_ERRORS: Record<string, string> = {
  EMAIL_EXISTS: "An account with this email already exists",
  EMAIL_NOT_FOUND: "Invalid email or password",
  INVALID_PASSWORD: "Invalid email or password",
  INVALID_LOGIN_CREDENTIALS: "Invalid email or password",
  USER_DISABLED: "This account has been disabled",
  OPERATION_NOT_ALLOWED: "Email/password sign-in is not enabled for this Firebase project. Enable it under Authentication → Sign-in method.",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Try again later.",
}

export class FirebaseAuthError extends Error {
  code: string
  constructor(code: string) {
    super(FRIENDLY_ERRORS[code] ?? code)
    this.code = code
  }
}

async function call<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${IDENTITY_TOOLKIT_BASE}/${endpoint}?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) {
    const code = String(data?.error?.message ?? "UNKNOWN_ERROR").split(" ")[0]
    throw new FirebaseAuthError(code)
  }
  return data as T
}

export function firebaseSignUp(email: string, password: string) {
  return call<{ idToken: string; localId: string; email: string }>("accounts:signUp", {
    email,
    password,
    returnSecureToken: true,
  })
}

export function firebaseSignInWithPassword(email: string, password: string) {
  return call<{ idToken: string; localId: string; email: string }>("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  })
}

export async function firebaseIsEmailVerified(idToken: string) {
  const data = await call<{ users: Array<{ emailVerified?: boolean }> }>("accounts:lookup", { idToken })
  return data.users[0]?.emailVerified ?? false
}

export function firebaseSendEmailVerification(idToken: string) {
  return call<{ email: string }>("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken })
}

export function firebaseSendPasswordResetEmail(email: string) {
  return call<{ email: string }>("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email })
}
