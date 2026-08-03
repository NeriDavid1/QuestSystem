import { useState, type FormEvent } from 'react'
import { useT } from '../../i18n'
import { Icon } from '../common/Icon'

export function AuthScreen({
  onSignIn,
  onSignUp,
}: {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}) {
  const t = useT()
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'signup') {
        await onSignUp(email, password)
        setInfo(t('authReadyOpening'))
      } else {
        await onSignIn(email, password)
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : t('authUnableEnter'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark large">Q</div>
        <p className="eyebrow">{t('authEyebrow')}</p>
        <h1>{t('authTitle')}</h1>
        <p className="auth-copy">{t('authCopy')}</p>
        <div className="auth-mode-tabs" role="tablist" aria-label={t('authModeAria')}>
          <button type="button" role="tab" className={mode === 'signup' ? 'active' : ''} aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); setInfo('') }}>{t('authCreateAccount')}</button>
          <button type="button" role="tab" className={mode === 'signin' ? 'active' : ''} aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setError(''); setInfo('') }}>{t('authSignIn')}</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            {t('authEmail')}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              dir="ltr"
              autoComplete="email"
              required
            />
          </label>
          <label>
            {t('authPassword')}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'signup' ? t('authPasswordPlaceholderSignup') : t('authPasswordPlaceholderSignin')}
              dir="ltr"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          {info && <p className="form-info">{info}</p>}
          <button className="button primary wide" disabled={busy}>
            {busy ? (mode === 'signup' ? t('authCreating') : t('authSigningIn')) : mode === 'signup' ? t('authCreateAndEdit') : t('authEnterEditor')}
            <Icon name="chevron" />
          </button>
        </form>
        <div className="auth-note">
          <Icon name="spark" />
          <span>{t('authFirstAccountNote')}</span>
        </div>
      </section>
      <div className="auth-orbit orbit-one" />
      <div className="auth-orbit orbit-two" />
    </main>
  )
}
