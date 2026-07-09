'use client'

import { useState, useEffect } from 'react'
import { detectLocale, getTranslations, type Locale, type LandingT } from '@/lib/i18n/translations'

export function useLocale(): { locale: Locale; t: LandingT } {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    setLocale(detectLocale())
  }, [])

  return { locale, t: getTranslations(locale) }
}
