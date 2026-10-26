import { useState, type FormEvent, type ReactNode } from 'react'
import type { AuthUser } from '../lib/authApi'

interface AuthFrameProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

function AuthFrame({ eyebrow, title, description, children, footer }: AuthFrameProps) {
  return (
    <section className="auth-page">
      <div className="auth-copy">
        <p className="section-label">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="auth-panel">
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
    </section>
  )
}

interface LoginPageProps {
  onSubmit: (email: string, password: string) => Promise<void>
  onNavigate: (path: string) => void
}

export function LoginPage({ onSubmit, onNavigate }: LoginPageProps) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)

    try {
      await onSubmit(String(form.get('email') ?? ''), String(form.get('password') ?? ''))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not sign you in. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Pick up where the work left off."
      description="Sign in to manage your projects and the portfolio you choose to share."
      footer={<>New to Decraft? <button className="inline-link" type="button" onClick={() => onNavigate('/signup')}>Create an account</button></>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <PasswordField
          id="login-password"
          autoComplete="current-password"
          visible={showPassword}
          onToggle={() => setShowPassword((visible) => !visible)}
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-dark auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">→</span>
        </button>
      </form>
    </AuthFrame>
  )
}

interface SignUpPageProps {
  onSubmit: (
    displayName: string,
    email: string,
    password: string,
    profileType: AuthUser['profile']['profile_type'],
  ) => Promise<void>
  onNavigate: (path: string) => void
}

export function SignUpPage({ onSubmit, onNavigate }: SignUpPageProps) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const profileType = String(form.get('profile_type') ?? 'individual') as AuthUser['profile']['profile_type']

    try {
      await onSubmit(
        String(form.get('display_name') ?? ''),
        String(form.get('email') ?? ''),
        String(form.get('password') ?? ''),
        profileType,
      )
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not create the account. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="For the people who make"
      title="Give your work a place to grow."
      description="Create an account to keep project notes, progress, and finished work together."
      footer={<>Already have an account? <button className="inline-link" type="button" onClick={() => onNavigate('/login')}>Sign in</button></>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>Your name or workshop
          <input name="display_name" autoComplete="name" minLength={2} maxLength={80} required />
        </label>
        <label>Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>Account type
          <select name="profile_type" defaultValue="individual">
            <option value="individual">Independent maker</option>
            <option value="workshop">Workshop</option>
            <option value="business">Business</option>
          </select>
        </label>
        <PasswordField
          id="signup-password"
          autoComplete="new-password"
          minLength={10}
          visible={showPassword}
          onToggle={() => setShowPassword((visible) => !visible)}
          hint="At least 10 characters"
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-dark auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'} <span aria-hidden="true">→</span>
        </button>
        <p className="auth-terms">Your account is ready to use as soon as it is created.</p>
      </form>
    </AuthFrame>
  )
}

function PasswordField({
  id,
  autoComplete,
  visible,
  onToggle,
  minLength,
  hint,
}: {
  id: string
  autoComplete: string
  visible: boolean
  onToggle: () => void
  minLength?: number
  hint?: string
}) {
  return (
    <div className="password-field">
      <div className="password-label">
        <label htmlFor={id}>Password</label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      <div className="password-input-wrap">
        <input
          id={id}
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          className="password-visibility"
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            {visible ? (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.7 4.1 10 7-0.5 1.1-1.3 2.3-2.3 3.3M6.2 6.2C4.1 7.5 2.7 9.5 2 12c1.3 2.9 4.8 7 10 7 1.4 0 2.7-.3 3.8-.9" />
              </>
            ) : (
              <>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  )
}
