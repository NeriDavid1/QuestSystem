import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  formatMessage,
  localeMeta,
  messages,
  type AppLocale,
  type MessageKey,
} from './messages'

const STORAGE_KEY = 'questforge.editor.locale'

type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string

type LocaleContextValue = {
  locale: AppLocale
  dir: 'rtl' | 'ltr'
  setLocale: (locale: AppLocale) => void
  t: TranslateFn
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'he' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return 'he'
}

function applyDocumentLocale(locale: AppLocale) {
  const meta = localeMeta[locale]
  document.documentElement.lang = meta.htmlLang
  document.documentElement.dir = meta.dir
  document.title = locale === 'he' ? 'QuestForge · ממלכת האנגלית' : 'QuestForge · English Kingdom'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    if (typeof window === 'undefined') return 'he'
    return readStoredLocale()
  })

  useEffect(() => {
    applyDocumentLocale(locale)
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
  }, [locale])

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
  }, [])

  const t = useCallback<TranslateFn>(
    (key, vars) => formatMessage(messages[locale][key], vars),
    [locale],
  )

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeMeta[locale].dir,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useLocale must be used within LocaleProvider')
  return context
}

export function useT() {
  return useLocale().t
}
