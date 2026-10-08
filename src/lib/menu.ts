export type MenuDish = { name: string; short: string }
export type MenuCategory = { category: string; dishes: MenuDish[] }

export const WAITERS = ['Саша', 'Денис', 'Вова'] as const
export const TABLE_COUNT = 12
export const TABLES = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1)

/** Гарниры — кнопки прямо на карточках горячих блюд */
export const GARNISH_OPTIONS: MenuDish[] = [
  { name: 'Картофель беби', short: 'Картофель' },
  { name: 'Овощное соте', short: 'Соте' },
  { name: 'Жасминовый рис', short: 'Рис' },
]

export const HOT_CATEGORY = 'Горячие блюда'

export const MENU: MenuCategory[] = [
  {
    category: 'Завтрак',
    dishes: [
      { name: 'Овсяная каша со свежими фруктами', short: 'Каша' },
      { name: 'Мини-сырники со сметаной и Nutella', short: 'Сырники' },
      { name: 'Омлет с сыром и овощами', short: 'Омлет' },
    ],
  },
  {
    category: 'Салаты',
    dishes: [
      { name: 'Ростбиф с листьями салата', short: 'Ростбиф' },
      { name: 'Копченая свекла со страчателлой', short: 'Свекла' },
      { name: 'Салат с гравлаксом из лосося', short: 'Гравлакс' },
    ],
  },
  {
    category: 'Горячие закуски',
    dishes: [
      { name: 'Сибас в гремолате', short: 'Сибас' },
      { name: 'Драники из батата', short: 'Драники' },
      { name: 'Кокиль с телятиной', short: 'Кокиль' },
    ],
  },
  {
    category: HOT_CATEGORY,
    dishes: [
      { name: 'Утиная грудка', short: 'Утка' },
      { name: 'Брискет из говядины', short: 'Брискет' },
      { name: 'Креветки в катаифи', short: 'Креветки' },
    ],
  },
  {
    category: 'Гарниры',
    dishes: [
      { name: 'Картофель беби', short: 'Картофель' },
      { name: 'Овощное соте', short: 'Соте' },
      { name: 'Жасминовый рис', short: 'Рис' },
    ],
  },
  {
    category: 'Десерты',
    dishes: [
      { name: 'Брауни с фундуком', short: 'Брауни' },
      { name: 'Томленая слива', short: 'Слива' },
      { name: 'Мини-чизкейк', short: 'Чизкейк' },
    ],
  },
]

export const ALL_DISHES: MenuDish[] = MENU.flatMap((c) => c.dishes)
export const DISH_BY_NAME = new Map<string, MenuDish>(ALL_DISHES.map((d) => [d.name, d]))
export const GARNISH_NAMES = new Set(GARNISH_OPTIONS.map((g) => g.name))

/** Горячие блюда — к ним предлагается гарнир прямо на карточке */
export function isHotDish(name: string): boolean {
  return MENU.find((c) => c.category === HOT_CATEGORY)?.dishes.some((d) => d.name === name) ?? false
}

export function shortName(dish: string): string {
  return DISH_BY_NAME.get(dish)?.short ?? dish
}
