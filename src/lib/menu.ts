import type { CookId, CookInfo, MenuItem, Period } from './types'

/* ============================================================
   ВИТАЛИК v6 — меню ресторана, столы, повара, пресеты.
   3 повара (цеха): 1 — Закуски и Десерты, 2 — Салаты и Завтрак,
   3 — Горячее и Гарниры.
   ============================================================ */

/** Столы 1–12 (ровно двенадцать) */
export const TABLES: number[] = Array.from({ length: 12 }, (_, i) => i + 1)

/** Официанты — ровно трое */
export const WAITER_NAMES = ['Саша', 'Денис', 'Вова'] as const

/** Повара — ровно трое */
export const COOKS: CookInfo[] = [
  { id: 1, title: 'Повар 1', station: 'Закуски и Десерты' },
  { id: 2, title: 'Повар 2', station: 'Салаты и Завтрак' },
  { id: 3, title: 'Повар 3', station: 'Горячее и Гарниры' },
]

export function cookTitle(id: CookId): string {
  return COOKS.find((c) => c.id === id)?.title ?? `Повар ${id}`
}

export function cookStation(id: CookId): string {
  return COOKS.find((c) => c.id === id)?.station ?? ''
}

/** Быстрые комментарии к блюду */
export const QUICK_NOTES: readonly string[] = ['Без лука', 'Без соуса']

/** Пресеты комментария к заказу (столу) */
export const ORDER_NOTE_PRESETS: readonly string[] = ['Детям вперёд', 'После тоста']

export const PERIOD_HOURS: Record<Period, string> = {
  breakfast: '10:00 – 12:00',
  lunch: '12:00 – 18:00',
}

export const PERIOD_LABELS: Record<Period, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
}

/** Порядок курсов в тикетах кухни: салаты → закуски → горячее → завтраки → десерты */
export const COURSE_ORDER: string[] = [
  'САЛАТЫ',
  'ГОРЯЧИЕ ЗАКУСКИ',
  'ГОРЯЧИЕ БЛЮДА',
  'ГАРНИРЫ',
  'ЗАВТРАКИ',
  'ДЕСЕРТЫ',
]

export const GARNISH_CATEGORY = 'ГАРНИРЫ'

interface RawItem {
  id: string
  name: string
  short: string
  description?: string
}

interface RawMenu {
  breakfast: { categories: { name: string; cook: CookId; items: RawItem[] }[] }
  lunch: { categories: { name: string; cook: CookId; items: RawItem[] }[] }
}

const RAW_MENU: RawMenu = {
  breakfast: {
    categories: [
      {
        name: 'ЗАВТРАКИ',
        cook: 2,
        items: [
          {
            id: 'b1',
            name: 'Овсяная каша со свежими фруктами',
            short: 'Овсяная каша',
            description: 'Со свежими сезонными фруктами',
          },
          {
            id: 'b2',
            name: 'Мини-сырники с муссом, сметаной и Nutella от Ferrero',
            short: 'Сырники',
            description: 'С муссом, сметаной и Nutella от Ferrero',
          },
          {
            id: 'b3',
            name: 'Классический омлет с сыром и свежими овощами',
            short: 'Омлет',
            description: 'С сыром и свежими овощами',
          },
        ],
      },
    ],
  },
  lunch: {
    categories: [
      {
        name: 'САЛАТЫ',
        cook: 2,
        items: [
          {
            id: 's1',
            name: 'Ростбиф с листьями салата',
            short: 'Ростбиф',
            description: 'Цукини, вяленые томаты, пармезан, чимичурри',
          },
          {
            id: 's2',
            name: 'Копченая свекла со страчателлой',
            short: 'Свекла со страчателлой',
            description: 'Жареные томаты, лаймовый соус, пекан',
          },
          {
            id: 's3',
            name: 'Салат с гравлаксом из лосося',
            short: 'Гравлакс',
            description: 'Перепелиное яйцо, шпинат, эстрагон',
          },
        ],
      },
      {
        name: 'ГОРЯЧИЕ ЗАКУСКИ',
        cook: 1,
        items: [
          {
            id: 'ha1',
            name: 'Сибас в гремолате с цукини',
            short: 'Сибас',
            description: 'Зелень, лимон, пармезан',
          },
          {
            id: 'ha2',
            name: 'Драники из батата с гуакамоле',
            short: 'Драники',
            description: 'Йогуртовый соус, вешенки',
          },
          {
            id: 'ha3',
            name: 'Кокиль с телятиной',
            short: 'Кокиль',
            description: 'Томленая телятина, сливочный соус, грибы, моцарелла',
          },
        ],
      },
      {
        name: 'ГОРЯЧИЕ БЛЮДА',
        cook: 3,
        items: [
          {
            id: 'm1',
            name: 'Утиная грудка',
            short: 'Утка',
            description: 'Соус вишня-мадера',
          },
          {
            id: 'm2',
            name: 'Брискет из говядины',
            short: 'Брискет',
            description: 'Демиглас, томаты конкассе, цукини',
          },
          {
            id: 'm3',
            name: 'Креветки в катаифи',
            short: 'Креветки',
            description: 'Манговый чатни',
          },
        ],
      },
      {
        name: 'ГАРНИРЫ',
        cook: 3,
        items: [
          {
            id: 'sd1',
            name: 'Картофель беби с розмарином',
            short: 'Картофель беби',
            description: 'Обжарен на сливочном масле с розмарином',
          },
          {
            id: 'sd2',
            name: 'Овощное соте',
            short: 'Овощное соте',
            description: 'Баклажан, цукини, перец, шампиньоны',
          },
          {
            id: 'sd3',
            name: 'Жасминовый рис припущенный',
            short: 'Жасминовый рис',
            description: 'Припущенный жасминовый рис',
          },
        ],
      },
      {
        name: 'ДЕСЕРТЫ',
        cook: 1,
        items: [
          {
            id: 'd1',
            name: 'Брауни с фундуком и Nutella',
            short: 'Брауни',
            description: 'С фундуком и Nutella от Ferrero',
          },
          {
            id: 'd2',
            name: 'Томленая слива со сливочным лабне',
            short: 'Томленая слива',
            description: 'Со сливочным лабне',
          },
          {
            id: 'd3',
            name: 'Мини-чизкейк с ягодами',
            short: 'Чизкейк',
            description: 'С прослойкой из экзотических фруктов',
          },
        ],
      },
    ],
  },
}

/** Сырники (Завтрак) готовит Повар 1 (Закуски и Десерты) — по ТЗ */
const COOK_OVERRIDES: Record<string, CookId> = { b2: 1 }

const buildMenu = (): MenuItem[] => {
  const out: MenuItem[] = []
  for (const period of ['breakfast', 'lunch'] as Period[]) {
    for (const cat of RAW_MENU[period].categories) {
      for (const it of cat.items) {
        out.push({
          id: it.id,
          name: it.name,
          short: it.short,
          description: it.description,
          category: cat.name,
          period,
          cook: COOK_OVERRIDES[it.id] ?? cat.cook,
          garnishAttachable:
            cat.name === 'ГОРЯЧИЕ ЗАКУСКИ' || cat.name === 'ГОРЯЧИЕ БЛЮДА',
          isGarnish: cat.name === GARNISH_CATEGORY,
        })
      }
    }
  }
  return out
}

/** Плоский список всех 18 позиций меню */
export const MENU: MenuItem[] = buildMenu()

const MENU_INDEX = new Map(MENU.map((m) => [m.id, m]))

export function findMenuItem(id: string): MenuItem | undefined {
  return MENU_INDEX.get(id)
}

/** Категории и блюда активной смены */
export function categoriesForPeriod(period: Period): { name: string; items: MenuItem[] }[] {
  return RAW_MENU[period].categories.map((c) => ({
    name: c.name,
    items: c.items
      .map((it) => MENU_INDEX.get(it.id))
      .filter((it): it is MenuItem => !!it),
  }))
}

export function itemsForPeriod(period: Period): MenuItem[] {
  return MENU.filter((m) => m.period === period)
}

/** Гарниры для окна выбора: sd1…sd3 */
export const GARNISH_ITEMS: MenuItem[] = MENU.filter((m) => m.isGarnish)

export const GARNISH_IDS: ReadonlySet<string> = new Set(GARNISH_ITEMS.map((g) => g.id))

/** Период по умолчанию по системному времени: 10:00–12:00 → завтрак */
export function defaultPeriod(now = new Date()): Period {
  const h = now.getHours()
  if (h >= 10 && h < 12) return 'breakfast'
  return 'lunch'
}
