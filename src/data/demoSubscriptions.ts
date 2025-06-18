// Тестовые данные подписок для демо-режима
export const demoSubscriptions = [
  {
    id: 'demo-1',
    name: 'Netflix',
    amount: 599,
    currency: '₽',
    billing_period: 'monthly' as const,
    next_payment_date: '2024-07-15',
    category: 'Развлечения',
    url: 'https://netflix.com'
  },
  {
    id: 'demo-2',
    name: 'Spotify Premium',
    amount: 299,
    currency: '₽',
    billing_period: 'monthly' as const,
    next_payment_date: '2024-07-20',
    category: 'Развлечения',
    url: 'https://spotify.com'
  },
  {
    id: 'demo-3',
    name: 'Adobe Creative Cloud',
    amount: 18000,
    currency: '₽',
    billing_period: 'yearly' as const,
    next_payment_date: '2024-12-01',
    category: 'Работа',
    url: 'https://adobe.com'
  },
  {
    id: 'demo-4',
    name: 'GitHub Pro',
    amount: 4800,
    currency: '₽',
    billing_period: 'yearly' as const,
    next_payment_date: '2024-11-15',
    category: 'Работа',
    url: 'https://github.com'
  },
  {
    id: 'demo-5',
    name: 'ChatGPT Plus',
    amount: 1999,
    currency: '₽',
    billing_period: 'monthly' as const,
    next_payment_date: '2024-07-25',
    category: 'ИИ',
    url: 'https://openai.com'
  },
  {
    id: 'demo-6',
    name: 'Figma Professional',
    amount: 1199,
    currency: '₽',
    billing_period: 'monthly' as const,
    next_payment_date: '2024-07-30',
    category: 'Работа',
    url: 'https://figma.com'
  },
  {
    id: 'demo-7',
    name: 'Yandex Plus',
    amount: 399,
    currency: '₽',
    billing_period: 'monthly' as const,
    next_payment_date: '2024-07-18',
    category: 'Мультисервис',
    url: 'https://plus.yandex.ru'
  },
  {
    id: 'demo-8',
    name: 'Notion Pro',
    amount: 799,
    currency: '₽',
    billing_period: 'monthly' as const,
    next_payment_date: '2024-08-05',
    category: 'Работа',
    url: 'https://notion.so'
  },
  {
    id: 'demo-9',
    name: 'PlayStation Plus',
    amount: 2499,
    currency: '₽',
    billing_period: 'monthly' as const,
    next_payment_date: '2024-07-22',
    category: 'Игры',
    url: 'https://playstation.com'
  }
];

export const demoUser = {
  id: 'demo-user',
  email: 'demo@example.com'
};