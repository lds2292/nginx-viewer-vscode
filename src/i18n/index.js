import ko from './ko.js'
import en from './en.js'
import ja from './ja.js'
import zhCN from './zh-cn.js'
import zhTW from './zh-tw.js'

const LOCALES = { ko, en, ja, 'zh-cn': zhCN, 'zh-tw': zhTW }

function getLocale() {
  const lang = (window.__vscode_locale__ || 'ko').toLowerCase()
  // zh-tw / zh-cn 처럼 하이픈 포함 코드 먼저 매칭
  if (LOCALES[lang]) return LOCALES[lang]
  // 'ko-KR' → 'ko' 처럼 앞부분만 매칭
  const code = lang.split('-')[0]
  return LOCALES[code] ?? LOCALES.en
}

export function useI18n() {
  const locale = getLocale()
  const t = (key, vars) => {
    let str = locale[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, v)
      }
    }
    return str
  }
  return { t }
}
