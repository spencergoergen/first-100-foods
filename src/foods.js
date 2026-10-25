// The starter list: exactly 100 common first foods. Ids are stable so saved tries keep matching.
export const CATEGORIES = [
  { id: 'fruit', label: 'Fruits', emoji: '🍓' },
  { id: 'veg', label: 'Veggies', emoji: '🥕' },
  { id: 'grain', label: 'Grains', emoji: '🌾' },
  { id: 'protein', label: 'Proteins', emoji: '🍗' },
  { id: 'dairy', label: 'Dairy', emoji: '🧀' },
  { id: 'nut', label: 'Nuts & seeds', emoji: '🥜' },
  { id: 'flavor', label: 'Flavors', emoji: '🌿' },
  { id: 'other', label: 'Other', emoji: '🍽️' },
]

// [name, emoji, allergen?]
const LIST = {
  fruit: [
    ['Avocado', '🥑'], ['Banana', '🍌'], ['Apple', '🍎'], ['Pear', '🍐'], ['Peach', '🍑'],
    ['Mango', '🥭'], ['Blueberries', '🫐'], ['Strawberries', '🍓'], ['Raspberries', '🍓'], ['Watermelon', '🍉'],
    ['Cantaloupe', '🍈'], ['Kiwi', '🥝'], ['Plum', '🟣'], ['Prunes', '🟤'], ['Apricot', '🍑'],
    ['Cherries', '🍒'], ['Orange', '🍊'], ['Grapes', '🍇'], ['Pineapple', '🍍'], ['Papaya', '🧡'],
  ],
  veg: [
    ['Sweet potato', '🍠'], ['Carrot', '🥕'], ['Butternut squash', '🎃'], ['Zucchini', '🥒'], ['Peas', '🫛'],
    ['Green beans', '🫛'], ['Broccoli', '🥦'], ['Cauliflower', '🥦'], ['Spinach', '🥬'], ['Kale', '🥬'],
    ['Beets', '🟥'], ['Potato', '🥔'], ['Pumpkin', '🎃'], ['Asparagus', '🌱'], ['Cucumber', '🥒'],
    ['Bell pepper', '🫑'], ['Tomato', '🍅'], ['Corn', '🌽'], ['Parsnip', '🥕'], ['Mushrooms', '🍄'],
    ['Cabbage', '🥬'], ['Brussels sprouts', '🥬'], ['Eggplant', '🍆'], ['Onion', '🧅'], ['Turnip', '⚪'],
  ],
  grain: [
    ['Oatmeal', '🥣'], ['Rice', '🍚'], ['Quinoa', '🌾'], ['Barley', '🌾'], ['Pasta', '🍝', 'Wheat'],
    ['Bread', '🍞', 'Wheat'], ['Pancakes', '🥞', 'Wheat, egg'], ['Couscous', '🌾', 'Wheat'], ['Millet', '🌾'],
    ['Farro', '🌾', 'Wheat'], ['Corn tortilla', '🫓'], ['Buckwheat', '🌾'],
  ],
  protein: [
    ['Chicken', '🍗'], ['Turkey', '🦃'], ['Beef', '🥩'], ['Pork', '🥓'], ['Lamb', '🍖'],
    ['Salmon', '🐟', 'Fish'], ['Cod', '🐟', 'Fish'], ['Tuna', '🐟', 'Fish'], ['Sardines', '🐟', 'Fish'],
    ['Shrimp', '🦐', 'Shellfish'], ['Egg', '🥚', 'Egg'], ['Tofu', '⬜', 'Soy'], ['Lentils', '🫘'],
    ['Black beans', '🫘'], ['Chickpeas', '🫘'], ['Hummus', '🫘', 'Sesame'], ['Pinto beans', '🫘'],
    ['Edamame', '🫛', 'Soy'],
  ],
  dairy: [
    ['Yogurt', '🥛', 'Dairy'], ['Cheddar cheese', '🧀', 'Dairy'], ['Cottage cheese', '🥛', 'Dairy'],
    ['Ricotta', '🧀', 'Dairy'], ['Mozzarella', '🧀', 'Dairy'], ['Butter', '🧈', 'Dairy'], ['Cream cheese', '🧀', 'Dairy'],
  ],
  nut: [
    ['Peanut butter', '🥜', 'Peanut'], ['Almond butter', '🌰', 'Tree nut'], ['Cashew butter', '🌰', 'Tree nut'],
    ['Tahini', '🫙', 'Sesame'], ['Chia seeds', '⚫'], ['Hemp seeds', '🌱'], ['Ground flaxseed', '🟫'],
    ['Sunflower seed butter', '🌻'],
  ],
  flavor: [
    ['Cinnamon', '🟫'], ['Garlic', '🧄'], ['Ginger', '🫚'], ['Basil', '🌿'], ['Cumin', '🟠'],
    ['Turmeric', '🟡'], ['Lemon', '🍋'], ['Coconut', '🥥'], ['Olive oil', '🫒'], ['Dill', '🌿'],
  ],
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export const DEFAULT_FOODS = Object.entries(LIST).flatMap(([cat, items]) =>
  items.map(([name, emoji, allergen]) => ({ id: slug(name), name, emoji, cat, allergen: allergen || '' }))
)

export const GOAL = 100

export const REACTIONS = [
  { id: 'loved', emoji: '😍', label: 'Loved' },
  { id: 'liked', emoji: '🙂', label: 'Liked' },
  { id: 'unsure', emoji: '😐', label: 'Unsure' },
  { id: 'disliked', emoji: '😖', label: 'Disliked' },
  { id: 'reaction', emoji: '⚠️', label: 'Reaction' },
]
export const reactionOf = (id) => REACTIONS.find((r) => r.id === id)
