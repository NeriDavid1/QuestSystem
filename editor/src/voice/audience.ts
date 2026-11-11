// Who a voice line talks to. Lines that address the player differently for a boy and a girl come in pairs:
// the line itself (heard by a boy) and its girl version, <clip>_girl.<ext> (variant 'girl'). Every other line
// is the same for everyone. The guide needs to know, to hear whether "תראה" / "תראי" fits.

export type Audience = 'boy' | 'girl' | 'everyone'

interface AudienceItem {
  clip_path: string
  variant?: string
}

/** "A/b/line.mp3" -> "A/b/line_girl.mp3" */
export function girlClipOf(clipPath: string): string {
  return clipPath.replace(/(\.[^./]+)?$/, (ext) => `_girl${ext}`)
}

/** Clip paths of the lines a boy hears because a girl version exists next to them. */
export function boyLinesOf(items: AudienceItem[]): Set<string> {
  const girls = new Set(items.filter((item) => item.variant === 'girl').map((item) => item.clip_path))
  return new Set(items.filter((item) => item.variant !== 'girl' && girls.has(girlClipOf(item.clip_path))).map((item) => item.clip_path))
}

export function audienceOf(item: AudienceItem, boyLines: Set<string>): Audience {
  if (item.variant === 'girl') return 'girl'
  return boyLines.has(item.clip_path) ? 'boy' : 'everyone'
}

export const AUDIENCE_TAG: Record<Audience, string> = {
  boy: 'פונה לבן',
  girl: 'פונה לבת',
  everyone: '',
}

/** One sentence for the line card, so the guide listens for the right form. */
export const AUDIENCE_HINT: Record<Audience, string> = {
  boy: 'המשפט הזה נשמע כשהשחקן הוא בן, ולכן הוא פונה בלשון זכר (יש לו גרסה נפרדת לבת).',
  girl: 'המשפט הזה נשמע כשהשחקנית היא בת, ולכן הוא פונה בלשון נקבה.',
  everyone: '',
}
