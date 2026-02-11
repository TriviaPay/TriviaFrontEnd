/**
 * Shop Items Data - TypeScript Implementation
 * Professional shop items data with comprehensive features
 */

export interface ShopItem {
  id: string;
  name: string;
  gems?: number;
  price?: string;
  description?: string;
  image: any;
  category: string;
  badge?: string;
  discount?: string;
  features?: string[];
  coins?: number;
}

export interface ShopItemsData {
  packs: ShopItem[];
  boosts: ShopItem[];
  cosmetics: ShopItem[];
  special: ShopItem[];
}

const boostItems: ShopItem[] = [
  {
    id: 'streak-saver',
    name: 'Streak Saver',
    gems: 100,
    price: '0.49',
    description: 'Save your streak',
    image: require('../../assets/icons/fire.png'),
    category: 'boosts',
  },
  {
    id: 'question-reroll',
    name: 'Question Reroll',
    gems: 80,
    description: 'Change your question',
    image: require('../../assets/icons/diamond.png'),
    category: 'boosts',
  },
  {
    id: 'extra-chance',
    name: 'Extra Chance',
    gems: 150,
    price: '0.99',
    description: 'Extra chance if you answer wrong',
    image: require('../../assets/icons/diamonds.png'),
    category: 'boosts',
  },
  {
    id: 'hint',
    name: 'Hint',
    gems: 30,
    description: 'Get a hint for the current question',
    image: require('../../assets/icons/diamond.png'),
    category: 'boosts',
  },
  {
    id: 'change-question',
    name: 'Change Question',
    gems: 10,
    description: 'Get a different question',
    image: require('../../assets/icons/diamond.png'),
    category: 'boosts',
  },
  {
    id: 'auto-submit',
    name: 'Auto Submit',
    gems: 300,
    description: 'Automatically submit correct answers',
    image: require('../../assets/icons/diamond.png'),
    category: 'boosts',
  },
];

const cosmeticItems: ShopItem[] = [
  {
    id: 'button-skins',
    name: 'Answer Button Skins',
    gems: 200,
    price: '0.99',
    description: 'Stylish buttons for trivia',
    image: require('../../assets/icons/diamond.png'),
    category: 'cosmetics',
  },
  {
    id: 'confetti',
    name: 'Confetti Win FX',
    gems: 150,
    description: 'Visual effect after winning',
    image: require('../../assets/icons/diamond.png'),
    category: 'cosmetics',
  },
  {
    id: 'profile-borders',
    name: 'Profile Borders',
    gems: 250,
    description: 'Fancy borders for profiles',
    image: require('../../assets/icons/diamond.png'),
    category: 'cosmetics',
  },
  {
    id: 'chat-bubbles',
    name: 'Chat Bubble Skins',
    gems: 300,
    price: '0.99',
    description: 'Custom chat styles',
    image: require('../../assets/icons/diamonds.png'),
    category: 'cosmetics',
  },
  {
    id: 'reaction-emojis',
    name: 'Reaction Emojis',
    gems: 150,
    description: 'Extra emoji reactions',
    image: require('../../assets/icons/diamond.png'),
    category: 'cosmetics',
  },
];

const specialItems: ShopItem[] = [
  {
    id: 'mystery-box',
    name: 'Mystery Box',
    gems: 350,
    price: '0.99',
    description: 'Random cosmetics or boosts',
    image: require('../../assets/icons/box.png'),
    category: 'special',
    badge: 'RANDOM',
  },
  {
    id: 'golden-crate',
    name: 'Golden Crate',
    gems: 750,
    price: '4.99',
    description: 'High-value bundle',
    image: require('../../assets/icons/Tpcoin.png'),
    category: 'special',
    badge: 'PREMIUM',
  },
  {
    id: 'streak-pack',
    name: 'Streak Pack',
    price: '2.99',
    description: 'Streak Saver + Bonus Question',
    image: require('../../assets/icons/fire.png'),
    category: 'special',
    discount: '-20%',
  },
];

const packItems: ShopItem[] = [
  {
    id: 'premium',
    name: 'PREMIUM',
    price: '8.99',
    features: ['No Ads', 'Unlimited Lives', '+'],
    coins: 50000,
    gems: 2000,
    image: require('../../assets/icons/chestbox.png'),
    category: 'packs',
    badge: 'BEST DEAL',
  },
  {
    id: 'two-in-one',
    name: '2 in 1',
    price: '3.99',
    coins: 5000,
    gems: 800,
    image: require('../../assets/icons/Tpcoin.png'),
    category: 'packs',
    badge: '2 in 1',
  },
  {
    id: 'coins-pack',
    name: 'Gems Pack',
    price: '0.99',
    coins: 2000,
    image: require('../../assets/icons/Tpcoin.png'),
    category: 'packs',
    discount: '-50%',
  },
];

export const shopItemsData: ShopItemsData = {
  packs: packItems,
  boosts: boostItems,
  cosmetics: cosmeticItems,
  special: specialItems,
};
