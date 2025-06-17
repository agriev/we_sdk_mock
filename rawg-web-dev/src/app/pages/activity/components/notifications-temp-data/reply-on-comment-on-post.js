/* eslint-disable sonarjs/no-duplicate-string */

export default {
  id: 200580,
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
  created: '2018-03-15T07:06:32.281746Z',
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
  discussions: {
    results: [
      {
        id: 42,
        user: {
          id: 6008,
          username: 'testuser20',
          slug: 'testuser20',
          full_name: '',
          avatar: null,
          games_count: 0,
          collections_count: 0,
        },
        title: 'what a strange game?',
        text: "i don't understand it",
        text_preview: '',
        text_previews: [],
        text_attachments: 0,
        created: '2018-03-12T04:34:23.098096Z',
        edited: '2018-03-12T04:34:23.098144Z',
        comments_count: 10,
        posts_count: 0,
        can_delete: false,
      },
    ],
    count: 1,
  },
  comments: {
    results: [
      {
        id: 119,
        parent: 118,
        text:
          'Меня зовут Эдди Османи. Сейчас я работаю JavaScript- и UI-разработчиком в AOL. Я занимаюсь планированием и написанием фронтенд-архитектуры для следующего поколения наших пользовательских приложений. Эти приложения весьма сложны. Они нуждаются в архитектуре, позволяющей, с одной стороны легко их масштабировать, а с другой достаточно легко использовать повторно их модули',
        created: '2018-03-15T07:06:32.281746Z',
        edited: '2018-03-15T07:06:32.281765Z',
        comments_count: 0,
        likes_count: 0,
        posts_count: 0,
        text_raw:
          'Меня зовут Эдди Османи. Сейчас я работаю JavaScript- и UI-разработчиком в AOL. Я занимаюсь планированием и написанием фронтенд-архитектуры для следующего поколения наших пользовательских приложений. Эти приложения весьма сложны. Они нуждаются в архитектуре, позволяющей, с одной стороны легко их масштабировать, а с другой достаточно легко использовать повторно их модули',
        user_like: false,
        user_post: false,
        can_delete: false,
        model: 'discussion',
        object_id: 42,
      },
      {
        id: 118,
        parent: null,
        text:
          'Меня зовут Эдди Османи. Сейчас я работаю JavaScript- и UI-разработчиком в AOL. Я занимаюсь планированием и написанием фронтенд-архитектуры для следующего поколения наших пользовательских приложений. Эти приложения весьма сложны. Они нуждаются в архитектуре, позволяющей, с одной стороны легко их масштабировать, а с другой достаточно легко использовать повторно их модули',
        created: '2018-03-15T07:06:07.106039Z',
        edited: '2018-03-15T07:06:07.106057Z',
        comments_count: 1,
        likes_count: 0,
        posts_count: 0,
        text_raw:
          'Меня зовут Эдди Османи. Сейчас я работаю JavaScript- и UI-разработчиком в AOL. Я занимаюсь планированием и написанием фронтенд-архитектуры для следующего поколения наших пользовательских приложений. Эти приложения весьма сложны. Они нуждаются в архитектуре, позволяющей, с одной стороны легко их масштабировать, а с другой достаточно легко использовать повторно их модули',
        user_like: false,
        user_post: false,
        can_delete: true,
        model: 'discussion',
        object_id: 42,
      },
    ],
    count: 2,
  },
  model: 'discussion',
};
