import type { CoursePriority, MenuItem, Period, Station, TableInfo } from './types'

/* ============================================================
   ВИТАЛИК — меню ресторана, столы, имена официантов, пресеты
   ============================================================ */

/** Столы 1–12 (ровно двенадцать) */
export const TABLES: TableInfo[] = Array.from({ length: 12 }, (_, i) => ({
  id: `t${i + 1}`,
  label: `Стол ${i + 1}`,
  short: String(i + 1),
  banquet: false,
}))

export const TABLES_BY_ID: ReadonlyMap<string, TableInfo> = new Map(TABLES.map((t) => [t.id, t]))

export function tableLabelOf(tableId: string): string {
  return TABLES_BY_ID.get(tableId)?.label ?? tableId
}

export function tableShortOf(tableId: string): string {
  return TABLES_BY_ID.get(tableId)?.short ?? tableId
}

/** Официанты — ровно трое */
export const WAITER_NAMES: readonly string[] = ['Саша', 'Денис', 'Вова']

/** Быстрые комментарии к блюду (в чеке) */
export const QUICK_NOTES: readonly string[] = ['Без лука', 'Без соуса', 'Без сахара']

/** Пресеты комментария к столу */
export const TABLE_NOTE_PRESETS: readonly string[] = [
  'Отдать строго после тоста',
  'Детям первым',
  'Гость опаздывает',
  'Счёт сразу',
]

export const PERIOD_HOURS: Record<Period, string> = {
  breakfast: '10:00 – 12:00',
  lunch: '12:00 – 18:00',
}

export const PERIOD_LABELS: Record<Period, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
}

interface RawCategory {
  name: string
  station: Station
  course_priority: number
  items: { id: string; name: string; description?: string; time: string }[]
}

const RAW_MENU: Record<Period, { hours: string; categories: RawCategory[] }> = {
  breakfast: {
    hours: '10:00 - 12:00',
    categories: [
      {
        name: 'Завтраки',
        station: 'breakfast',
        course_priority: 1,
        items: [
          { id: 'b1', name: 'Овсяная каша со свежими фруктами', time: '8 мин' },
          { id: 'b2', name: 'Мини-сырники с муссом, сметаной и Nutella', time: '12 мин' },
          { id: 'b3', name: 'Классический омлет с сыром и овощами', time: '10 мин' },
        ],
      },
    ],
  },
  lunch: {
    hours: '12:00 - 18:00',
    categories: [
      {
        name: 'САЛАТЫ',
        station: 'cold',
        course_priority: 1,
        items: [
          {
            id: 's1',
            name: 'Ростбиф с листьями салата',
            description: 'Подается с цукини, вялеными томатами и пармезаном в соусе Чимичурри',
            time: '7 мин',
          },
          {
            id: 's2',
            name: 'Копченая свекла со страчателлой',
            description: 'С жареными томатами, лаймовым соусом и орехами пекан',
            time: '7 мин',
          },
          {
            id: 's3',
            name: 'Салат с гравлаксом из лосося',
            description: 'С перепелиным яйцом на листьях шпината и эстрагоновым соусом',
            time: '8 мин',
          },
        ],
      },
      {
        name: 'ГОРЯЧИЕ ЗАКУСКИ',
        station: 'hot_appetizer',
        course_priority: 2,
        items: [
          {
            id: 'ha1',
            name: 'Сибас в гремолате с цукини',
            description: 'В приправе из ароматного букета зелени, лимона и пармезана',
            time: '12 мин',
          },
          {
            id: 'ha2',
            name: 'Драники из батата с гуакамоле',
            description: 'С йогуртовым соусом и вешенками',
            time: '14 мин',
          },
          {
            id: 'ha3',
            name: 'Кокиль с телятиной',
            description: 'Томленая телятина в сливочном соусе с грибами, запеченная с моцареллой',
            time: '15 мин',
          },
        ],
      },
      {
        name: 'ГОРЯЧИЕ БЛЮДА',
        station: 'hot_main',
        course_priority: 3,
        items: [
          { id: 'm1', name: 'Утиная грудка с соусом вишня-мадера', description: 'С соусом из вишни и Мадеры', time: '18 мин' },
          {
            id: 'm2',
            name: 'Брискет из говядины',
            description: 'В соусе демиглас с конкассе из томатов на бланшированных цукини',
            time: '16 мин',
          },
          { id: 'm3', name: 'Креветки в катаифи', description: 'С манговым чатни', time: '14 мин' },
        ],
      },
      {
        name: 'ГАРНИРЫ',
        station: 'hot_main',
        course_priority: 3,
        items: [
          {
            id: 'sd1',
            name: 'Картофель беби с розмарином',
            description: 'Обжаренный на сливочном масле с розмарином',
            time: '10 мин',
          },
          {
            id: 'sd2',
            name: 'Овощное соте',
            description: 'Баклажан, цукини, перец болгарский, шампиньоны',
            time: '12 мин',
          },
          { id: 'sd3', name: 'Жасминовый рис припущенный', description: 'Припущенный рис', time: '6 мин' },
        ],
      },
      {
        name: 'ДЕСЕРТЫ',
        station: 'pastry',
        course_priority: 4,
        items: [
          { id: 'd1', name: 'Брауни с фундуком и Nutella', description: 'С пастой Nutella от Ferrero', time: '6 мин' },
          {
            id: 'd2',
            name: 'Томленая слива со сливочным лабне',
            description: 'С мускатом и апельсиновым маслом',
            time: '7 мин',
          },
          {
            id: 'd3',
            name: 'Мини-чизкейк с ягодами',
            description: 'С прослойкой из экзотических фруктов и свежими ягодами',
            time: '5 мин',
          },
        ],
      },
    ],
  },
}

/** Плоский список всех позиций меню */
export const MENU: MenuItem[] = (Object.keys(RAW_MENU) as Period[]).flatMap((period) =>
  RAW_MENU[period].categories.flatMap((cat) =>
    cat.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      time: it.time,
      station: cat.station,
      coursePriority: cat.course_priority as CoursePriority,
      category: cat.name,
      period,
      isGarnish: cat.name === 'ГАРНИРЫ',
    })),
  ),
)

const MENU_INDEX = new Map(MENU.map((m) => [m.id, m]))

export function findMenuItem(id: string): MenuItem | undefined {
  return MENU_INDEX.get(id)
}

/* ---------- категории ---------- */

export interface MenuCategory {
  name: string
  chipLabel: string
}

const CHIP_LABELS: Record<string, string> = {
  Завтраки: 'Завтраки',
  САЛАТЫ: 'Салаты',
  'ГОРЯЧИЕ ЗАКУСКИ': 'Закуски',
  'ГОРЯЧИЕ БЛЮДА': 'Горячее',
  ГАРНИРЫ: 'Гарниры',
  ДЕСЕРТЫ: 'Десерты',
}

export function categoriesForPeriod(period: Period): MenuCategory[] {
  return RAW_MENU[period].categories.map((c) => ({
    name: c.name,
    chipLabel: CHIP_LABELS[c.name] ?? c.name,
  }))
}

export function itemsForPeriod(period: Period): MenuItem[] {
  return MENU.filter((m) => m.period === period)
}

/* ---------- гарниры ---------- */

export const GARNISH_CATEGORY = 'ГАРНИРЫ'

/** Категории блюд, к которым можно привязать гарнир */
export const ATTACHABLE_CATEGORIES: readonly string[] = ['ГОРЯЧИЕ ЗАКУСКИ', 'ГОРЯЧИЕ БЛЮДА']

/** Гарниры для всплывающего окна (sd1…sd3) */
export const GARNISH_ITEMS: MenuItem[] = MENU.filter((m) => m.category === GARNISH_CATEGORY)

export const GARNISH_IDS: ReadonlySet<string> = new Set(GARNISH_ITEMS.map((g) => g.id))

/** К блюду можно привязать гарнир? (горячие закуски и горячие блюда) */
export function isGarnishAttachable(item: MenuItem): boolean {
  return ATTACHABLE_CATEGORIES.includes(item.category)
}

/** Дательный падеж для сводки гарниров («к Утке», «к Сибасу») */
export const DATIVE_NAMES: Record<string, string> = {
  ha1: 'Сибасу',
  ha2: 'Драникам',
  ha3: 'Кокилю',
  m1: 'Утке',
  m2: 'Брискету',
  m3: 'Креветкам',
}

/** Период по умолчанию по системному времени: 10:00–12:00 → завтрак, иначе обед */
export function defaultPeriod(now = new Date()): Period {
  const h = now.getHours()
  if (h >= 10 && h < 12) return 'breakfast'
  return 'lunch'
}

/** Названия курсов для сводки цехов (батчинг) */
export const COURSE_TITLES: Record<CoursePriority, string> = {
  1: 'Салаты',
  2: 'Горячие закуски',
  3: 'Горячие блюда и гарниры',
  4: 'Десерты',
}
