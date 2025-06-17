/* eslint-disable sonarjs/no-duplicate-string */

export default {
  id: 200508,
  user: {
    id: 6008,
    username: 'testuser20',
    slug: 'testuser20',
    full_name: '',
    avatar: null,
    games_count: 0,
    collections_count: 0,
  },
  action: 'added_comment',
  created: '2018-03-12T04:33:20.604795Z',
  games: {
    results: [
      {
        id: 24170,
        slug: 'donkey-kong-country-returns',
        name: 'Donkey Kong Country Returns',
        released: '2010-11-21',
        platforms: [
          {
            platform: {
              id: 11,
              name: 'Wii',
              slug: 'wii',
            },
          },
          {
            platform: {
              id: 10,
              name: 'Wii U',
              slug: 'wii-u',
            },
          },
        ],
        dominant_color: '4b96cd',
        saturated_color: '379ab8',
        background_image:
          'https://resize.rawg.io/media/https://api.rawg.io/media/screenshots/bbc/bbc90ea7365b49018149d093ee658ec3.jpg',
        rating_top: 0,
        ratings: [
          {
            percent: 50,
            title: 'exceptional',
            id: 5,
            count: 2,
          },
          {
            percent: 50,
            title: 'recommended',
            id: 4,
            count: 2,
          },
        ],
        added: 16,
        charts: {
          year: {
            change: 'up',
            position: 457,
            year: 2010,
          },
        },
        user_game: null,
        user_review: null,
        parent_platforms: [
          {
            platform: {
              id: 7,
              name: 'Nintendo',
              slug: 'nintendo',
            },
            selected: false,
          },
        ],
        reviews_count: 4,
        reviews_users: [
          {
            id: 4367,
            username: 'UzeQ',
            slug: 'uzeq',
            full_name: 'Bartosz Kałkus',
            avatar: null,
            games_count: 1274,
            collections_count: 0,
            review_id: 13774,
          },
          {
            id: 4195,
            username: 'Arecher',
            slug: 'arecher',
            full_name: 'Jorian Rutten',
            avatar: null,
            games_count: 1148,
            collections_count: 0,
            review_id: 14363,
          },
          {
            id: 3732,
            username: 'ivand88',
            slug: 'ivand88',
            full_name: '',
            avatar: null,
            games_count: 29,
            collections_count: 1,
            review_id: 13401,
          },
          {
            id: 3270,
            username: 'new_omega',
            slug: 'new_omega',
            full_name: 'Konstantin Komarov',
            avatar: null,
            games_count: 115,
            collections_count: 0,
            review_id: 25774,
          },
        ],
      },
    ],
    count: 1,
  },
  reviews: {
    results: [
      {
        id: 25774,
        user: 3270,
        game: 24170,
        text:
          'Этот Донки Конг как пиво. Либо ты такое пьёшь, большими глотками, утоляя жажду яркого и сложного платформера, наслаждаясь полнотой вкуса и проработанностью механик, до тех пор, пока ты не станешь пьян и не сможешь нормально пройти следующий уровень, прежде чем передохнёшь.. Либо ты едва допиваешь одну кружку и убираешь в сторону.',
        text_preview: '',
        text_previews: [],
        text_attachments: 0,
        rating: 4,
        reactions: [
          {
            id: 6,
            title: 'Constantly dying and enjoy it',
            positive: true,
          },
        ],
        created: '2018-03-06T22:51:32.750788Z',
        edited: '2018-03-06T22:51:32.750843Z',
        likes_count: 1,
        likes_positive: 1,
        likes_rating: 1,
        can_delete: false,
      },
    ],
    count: 1,
  },
  comments: {
    results: [
      {
        id: 86,
        parent: 84,
        text:
          'Меня зовут Эдди Османи. Сейчас я работаю JavaScript- и UI-разработчиком в AOL. Я занимаюсь планированием и написанием фронтенд-архитектуры для следующего поколения наших пользовательских приложений. Эти приложения весьма сложны. Они нуждаются в архитектуре, позволяющей, с одной стороны легко их масштабировать, а с другой достаточно легко использовать повторно их модули',
        created: '2018-03-12T04:33:20.604795Z',
        edited: '2018-03-12T04:33:20.604815Z',
        comments_count: 0,
        likes_count: 0,
        posts_count: 0,
        text_raw:
          'Меня зовут Эдди Османи. Сейчас я работаю JavaScript- и UI-разработчиком в AOL. Я занимаюсь планированием и написанием фронтенд-архитектуры для следующего поколения наших пользовательских приложений. Эти приложения весьма сложны. Они нуждаются в архитектуре, позволяющей, с одной стороны легко их масштабировать, а с другой достаточно легко использовать повторно их модули',
        user_like: false,
        user_post: false,
        can_delete: false,
        model: 'review',
        object_id: 25774,
      },
      {
        id: 84,
        parent: null,
        text:
          'Меня зовут Эдди Османи. Сейчас я работаю JavaScript- и UI-разработчиком в AOL. Я занимаюсь планированием и написанием фронтенд-архитектуры для следующего поколения наших пользовательских приложений. Эти приложения весьма сложны. Они нуждаются в архитектуре, позволяющей, с одной стороны легко их масштабировать, а с другой достаточно легко использовать повторно их модули',
        created: '2018-03-12T04:32:58.953336Z',
        edited: '2018-03-12T04:32:58.953350Z',
        comments_count: 2,
        likes_count: 0,
        posts_count: 0,
        text_raw:
          'Меня зовут Эдди Османи. Сейчас я работаю JavaScript- и UI-разработчиком в AOL. Я занимаюсь планированием и написанием фронтенд-архитектуры для следующего поколения наших пользовательских приложений. Эти приложения весьма сложны. Они нуждаются в архитектуре, позволяющей, с одной стороны легко их масштабировать, а с другой достаточно легко использовать повторно их модули',
        user_like: false,
        user_post: false,
        can_delete: false,
        model: 'review',
        object_id: 25774,
      },
    ],
    count: 2,
  },
  model: 'review',
};
