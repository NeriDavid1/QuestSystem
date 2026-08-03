import { useState } from 'react'
import { useT } from '../../i18n'
import { Icon } from '../common/Icon'

export function AccessRequired({
  email,
  message,
  onSignOut,
  onRetryJoin,
}: {
  email?: string
  message?: string
  onSignOut: () => Promise<void>
  onRetryJoin: () => Promise<void>
}) {
  const t = useT()
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const retry = async () => {
    setJoining(true)
    setJoinError('')
    try {
      await onRetryJoin()
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : t('accessJoinFailed'))
    } finally {
      setJoining(false)
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card access-card">
        <div className="brand-mark large">Q</div>
        <p className="eyebrow">{t('accessEyebrow')}</p>
        <h1>{t('accessTitle')}</h1>
        <p className="auth-copy">
          {message ?? t('accessCopy')}
        </p>
        <div className="auth-note"><Icon name="spark" /><span>{email ?? t('accessAuthenticated')}</span></div>
        {joinError && <p className="form-error">{joinError}</p>}
        <button className="button primary wide" disabled={joining} onClick={() => void retry()}>
          {joining ? t('accessJoining') : t('accessEnter')}
        </button>
        <button className="button subtle wide" onClick={() => void onSignOut()}><Icon name="logout" /> {t('accessSignOut')}</button>
      </section>
    </main>
  )
}
