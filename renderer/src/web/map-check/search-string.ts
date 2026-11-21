import type { MapCheckConfig } from './common.js'

// Генерация строки поиска для вкладки карт (Ctrl+F в игре) по danger-модам
// активного профиля. Портировано из gen_map_search.py (Neoniklain fork).

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g
const MIN_LEN = 6
const MIN_SINGLE = 9
const MAX_LEN = 45

export interface SearchStrings {
  runnable: string // подсветка проходимых карт: "!(...)"
  bad: string // подсветка плохих карт: "(...)"
  count: number
}

function fold (s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е')
}

function escapeRegex (s: string): string {
  return s.replace(REGEX_SPECIAL, '\\$&')
}

function wordSpans (text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    spans.push([m.index, m.index + m[0].length])
  }
  return spans
}

function uniqueFragment (matcher: string, othersFolds: string[]): string | null {
  const spans = wordSpans(matcher)
  let best: { key: [number, number], frag: string } | null = null
  for (let i = 0; i < spans.length; ++i) {
    for (let j = i; j < spans.length; ++j) {
      const frag = matcher.slice(spans[i][0], spans[j][1])
      if (frag.length > MAX_LEN) break
      if (frag.includes('#') || frag.length < MIN_LEN) continue
      if (!frag.includes(' ') && frag.length < MIN_SINGLE) continue
      const f = fold(frag)
      if (othersFolds.every(o => !o.includes(f))) {
        const key: [number, number] = [frag.length, -spans[i][0]]
        if (best === null || key[0] < best.key[0] ||
            (key[0] === best.key[0] && key[1] < best.key[1])) {
          best = { key, frag }
        }
      }
    }
  }
  return best?.frag ?? null
}

function commonPrefix (a: string, b: string): string {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) ++i
  return a.slice(0, i)
}

function factor (alts: string[]): string {
  const groups = new Map<string, string[]>()
  for (const a of alts) {
    const first = a.split(' ', 1)[0]
    const arr = groups.get(first) ?? []
    arr.push(a)
    groups.set(first, arr)
  }
  const parts: string[] = []
  for (const gs of groups.values()) {
    if (gs.length === 1) {
      parts.push(gs[0])
      continue
    }
    let pref = gs.reduce(commonPrefix)
    const sp = pref.lastIndexOf(' ')
    if (sp !== -1) pref = pref.slice(0, sp + 1)
    if (pref.length >= 5) {
      const rest = gs.map(g => g.slice(pref.length)).sort().join('|')
      parts.push(pref.trimEnd() + ' (' + rest + ')')
    } else {
      parts.push('(' + gs.slice().sort().join('|') + ')')
    }
  }
  return parts.sort().join('|')
}

export function buildSearchStrings (config: MapCheckConfig): SearchStrings | null {
  const idx = config.profile - 1
  const corpus = config.selectedStats
  const chosen = corpus.filter(e => (e.decision.charAt(idx) || '-') === 'd')
  if (!chosen.length) return null

  const allFolds = corpus.map(e => fold(e.matcher))
  const frags = new Set<string>()
  for (const e of chosen) {
    const self = corpus.indexOf(e)
    const others = allFolds.filter((_, k) => k !== self)
    const f = uniqueFragment(e.matcher, others)
    frags.add(f === null
      ? escapeRegex(e.matcher).replace(/#/g, '\\d+')
      : escapeRegex(f))
  }
  const core = factor([...frags].sort((a, b) => a.length - b.length))
  return {
    runnable: `"!(${core})"`,
    bad: `"(${core})"`,
    count: chosen.length
  }
}
