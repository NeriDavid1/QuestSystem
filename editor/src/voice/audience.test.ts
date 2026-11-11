import { describe, expect, it } from 'vitest'
import { audienceOf, boyLinesOf, girlClipOf } from './audience'

describe('who a line talks to', () => {
  it('pairs a line with its girl version by file name; other lines are for everyone', () => {
    const items = [
      { clip_path: 'Voice/Quests/x/line_01.mp3', variant: '' },
      { clip_path: 'Voice/Quests/x/line_01_girl.mp3', variant: 'girl' },
      { clip_path: 'Voice/Quests/x/line_02.mp3', variant: '' },
      { clip_path: 'Voice/Legacy/chef_girl.mp3', variant: 'girl' }, // its boy line has no new take
    ]
    const boys = boyLinesOf(items)
    expect(items.map((item) => audienceOf(item, boys))).toEqual(['boy', 'girl', 'everyone', 'girl'])
    expect(girlClipOf('a.b/c.mp3')).toBe('a.b/c_girl.mp3')
  })
})
