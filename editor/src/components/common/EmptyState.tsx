export function EmptyState({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  )
}
