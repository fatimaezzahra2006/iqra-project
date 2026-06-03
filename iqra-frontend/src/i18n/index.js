import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en     from './locales/en.json';
import fr     from './locales/fr.json';
import ar     from './locales/ar.json';
import darija from './locales/darija.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en:     { translation: en },
      fr:     { translation: fr },
      ar:     { translation: ar },
      darija: { translation: darija },
    },
    fallbackLng: 'fr',
    supportedLngs: ['en', 'fr', 'ar', 'darija'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
