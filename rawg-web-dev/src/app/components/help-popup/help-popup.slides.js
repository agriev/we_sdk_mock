import slide1en from './assets/1-en.jpg';
import slide2en from './assets/2-en.jpg';
import slide3en from './assets/3-en.jpg';
import slide4en from './assets/4-en.jpg';

import slide1ru from './assets/1-ru.jpg';
import slide2ru from './assets/2-ru.jpg';
import slide3ru from './assets/3-ru.jpg';
import slide4ru from './assets/4-ru.jpg';

const slides = [
  {
    image: {
      en: slide1en,
      ru: slide1ru,
    },
    key: 'all-games-in-one-place',
    title: {
      en: 'All your games in one place',
      ru: 'Все ваши игры в одном месте',
    },
    text: {
      en: 'Mark the games you have completed and wishlist new ones.',
      ru: 'Отмечайте игры, которые вы прошли, и добавляйте в вишлист новые.',
    },
  },

  {
    image: {
      en: slide2en,
      ru: slide2ru,
    },
    key: 'recommendations-logic',
    title: {
      en: 'Recommend great games to the community',
      ru: 'Советуйте игры другим участникам сообщества',
    },
    text: {
      en: 'Rate and review games with the fun and easy-to-understand scoring system.',
      ru: 'Пишите рецензии и оценивайте игры с помощью уникальной и простой системы оценок.',
    },
  },

  {
    image: {
      en: slide3en,
      ru: slide3ru,
    },
    key: 'personal-recommendations',
    title: {
      en: 'Explore personal recommendations',
      ru: 'Изучайте персональные рекомендации',
    },
    text: {
      en: 'Watch straight-to-the-point gameplay videos and full trailers for the games you will like.',
      ru: 'Выбирайте игры с помощью коротких геймплейных видео и полноценных трейлеров.',
    },
  },

  {
    image: {
      en: slide4en,
      ru: slide4ru,
    },
    key: 'stay-up-to-date',
    title: {
      en: 'Stay up to date',
      ru: 'Оставайтесь в курсе',
    },
    text: {
      en:
        'Return tomorrow to find new games for any of your platforms and keep a log of what you played and waiting for.',
      ru:
        'Не забывайте возвращаться, чтобы находить новые игры для своих платформ и обновлять свою игротеку и вишлист.',
    },
  },
];

export default slides;
