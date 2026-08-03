export function Icon({ name }: { name: string }) {
  const glyphs: Record<string, string> = {
    book: '▤',
    check: '✓',
    chevron: '›',
    close: '×',
    copy: '⧉',
    eye: '◉',
    grid: '▦',
    lock: '⌑',
    logout: '↪',
    plus: '+',
    refresh: '↻',
    save: '↓',
    search: '⌕',
    settings: '⚙',
    spark: '✦',
    redo: '↷',
    undo: '↶',
    users: '♙',
    warning: '!',
  }
  return <span className="icon" data-name={name} aria-hidden="true">{glyphs[name] ?? '•'}</span>
}
