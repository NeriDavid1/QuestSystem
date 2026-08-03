export function Toast({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  return <div className={`toast ${tone}`}><span>{tone === 'success' ? '✓' : '!'}</span>{message}</div>
}
