/* eslint-disable camelcase */

import PropTypes from 'prop-types';

export const GAME_STATUS_OWNED = 'owned'; // Default category for owned game
export const GAME_STATUS_PLAYING = 'playing';
export const GAME_STATUS_BEATEN = 'beaten'; // Completed
export const GAME_STATUS_DROPPED = 'dropped'; // Abandoned
export const GAME_STATUS_YET = 'yet'; // Not played; waiting for play
export const GAME_STATUS_TOPLAY = 'toplay'; // Wishlist

export const GAME_ALL_STATUSES = [
  GAME_STATUS_OWNED,
  GAME_STATUS_PLAYING,
  GAME_STATUS_BEATEN,
  GAME_STATUS_DROPPED,
  GAME_STATUS_YET,
  GAME_STATUS_TOPLAY,
];

export const GAME_ADDED_STATUSES = [
  GAME_STATUS_OWNED,
  GAME_STATUS_PLAYING,
  GAME_STATUS_BEATEN,
  GAME_STATUS_DROPPED,
  GAME_STATUS_YET,
];

export const GAME_ADDED_CLEAR_STATUSES = [
  GAME_STATUS_PLAYING,
  GAME_STATUS_BEATEN,
  GAME_STATUS_DROPPED,
  GAME_STATUS_YET,
];

export const esrbTitles = {
  1: '0+',
  2: '10+',
  3: '13+',
  4: '17+',
  5: '18+',
  6: 'RP',
  null: 'Not rated',
};

export const id = PropTypes.number;
export const name = PropTypes.string;
export const iframe = PropTypes.string;
export const slug = PropTypes.string;
export const image = PropTypes.any;
export const dominant_color = PropTypes.string;
export const saturated_color = PropTypes.string;
export const description = PropTypes.string;
export const metacritic = PropTypes.number;
export const released = PropTypes.string;
export const playtime = PropTypes.number;
export const reviews_count = PropTypes.number;
export const rating = PropTypes.number;
export const rating_top = PropTypes.number;
export const background_image = PropTypes.string;
export const background_image_additional = PropTypes.string;
export const added = PropTypes.number;
export const esrb_rating = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  slug: PropTypes.string,
});
export const website = PropTypes.string;
export const promo = PropTypes.string;
export const tba = PropTypes.bool;
export const youtube_count = PropTypes.number;
export const user_review = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.shape({
    id: PropTypes.number,
    is_text: PropTypes.bool,
    rating: PropTypes.number,
  }),
]);
export const loading = PropTypes.bool;
export const discussions_count = PropTypes.number;
export const screenshots_count = PropTypes.number;
export const movies_count = PropTypes.number;
export const collections_count = PropTypes.number;
export const achievements_count = PropTypes.number;
export const parent_achievements_count = PropTypes.number;
export const reddit_url = PropTypes.string;
export const reddit_name = PropTypes.string;
export const reddit_description = PropTypes.string;
export const reddit_logo = PropTypes.string;
export const reddit_count = PropTypes.number;
export const twitch_count = PropTypes.number;
export const imgur_count = PropTypes.number;
export const suggestions_count = PropTypes.number;
export const creators_count = PropTypes.number;
export const updated = PropTypes.string;

export const user_game = PropTypes.shape({
  added: PropTypes.string,
  status: PropTypes.string,
  platforms: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      parent_id: PropTypes.number,
      slug: PropTypes.string,
    }),
  ),
});

export const user_collections = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    game_in_collection: PropTypes.bool,
    name: PropTypes.string,
    slug: PropTypes.string,
  }),
);

export const platforms = PropTypes.arrayOf(
  PropTypes.shape({
    platform: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
    requirements: PropTypes.any,
    released_at: PropTypes.string,
  }),
);

export const parent_platforms = PropTypes.arrayOf(
  PropTypes.shape({
    selected: PropTypes.bool,
    platform: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  }),
);

export const developers = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    slug: PropTypes.string,
  }),
);

export const categories = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    slug: PropTypes.string,
  }),
);

export const genres = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    slug: PropTypes.string,
  }),
);

export const tags = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    slug: PropTypes.string,
  }),
);

export const additions = PropTypes.shape({
  count: PropTypes.number,
  loading: PropTypes.bool,
  next: PropTypes.number,
  previous: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
});

export const gameSeries = PropTypes.shape({
  count: PropTypes.number,
  loading: PropTypes.bool,
  next: PropTypes.number,
  previous: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
});

export const parents = PropTypes.shape({
  count: PropTypes.number,
  loading: PropTypes.bool,
  next: PropTypes.number,
  previous: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
});

export const publishers = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    slug: PropTypes.string,
  }),
);

export const screenshots = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      image: PropTypes.string.isRequired,
      is_deleted: PropTypes.bool.isRequired,
      game: PropTypes.number,
    }),
  ),
  loading: PropTypes.bool,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
});

export const movies = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      preview: PropTypes.string,
      data: PropTypes.shape({
        480: PropTypes.string,
        max: PropTypes.string,
      }),
    }),
  ),
  loading: PropTypes.bool,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
});

export const clipType = PropTypes.shape({
  clip: PropTypes.string,
  preview: PropTypes.string,
  clips: PropTypes.shape({
    '320': PropTypes.string,
    '640': PropTypes.string,
    full: PropTypes.string,
  }),
});

export const collectionResult = PropTypes.shape({
  id: PropTypes.number,
  slug: PropTypes.string,
  name: PropTypes.string,
  description: PropTypes.string,
  creator: PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
    slug: PropTypes.string,
    full_name: PropTypes.string,
    avatag: PropTypes.string,
    games_count: PropTypes.number,
    collections_count: PropTypes.number,
  }),
  created: PropTypes.string,
  updated: PropTypes.string,
  game_background: PropTypes.shape({
    saturated_color: PropTypes.string,
    url: PropTypes.string,
    dominant_color: PropTypes.string,
  }),
  background: PropTypes.arrayOf(
    PropTypes.shape({
      saturated_color: PropTypes.string,
      url: PropTypes.string,
      dominant_color: PropTypes.string,
    }),
  ),
  games_count: PropTypes.number,
  followers_count: PropTypes.number,
  posts_count: PropTypes.number,
  likes_count: PropTypes.number,
  likes_positive: PropTypes.number,
  likes_rating: PropTypes.number,
  share_image: PropTypes.string,
  language: PropTypes.string,
  description_raw: PropTypes.string,
  game_covers: PropTypes.arrayOf(
    PropTypes.shape({
      saturated_color: PropTypes.string,
      url: PropTypes.string,
      dominant_color: PropTypes.string,
    }),
  ),
  following: PropTypes.bool,
  user_like: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
});

export const collections = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(collectionResult),
  loading: PropTypes.bool,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
});

export const suggestionResult = PropTypes.shape({
  id: PropTypes.number,
  slug: PropTypes.string,
  name: PropTypes.string,
  released: PropTypes.string,
  platforms: PropTypes.arrayOf(
    PropTypes.shape({
      platform: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        slug: PropTypes.string,
      }),
    }),
  ),
  dominant_color: PropTypes.string,
  saturated_color: PropTypes.string,
  background_image: PropTypes.string,
  rating_top: PropTypes.number,
  ratings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      title: PropTypes.string,
      percent: PropTypes.number,
      count: PropTypes.number,
    }),
  ),
  added: PropTypes.number,
  charts: PropTypes.shape({
    toplay: PropTypes.number,
    genre: PropTypes.object,
    full: PropTypes.number,
  }),
  user_game,
  user_review: PropTypes.shape({
    id: PropTypes.number,
    is_text: PropTypes.bool,
    rating: PropTypes.number,
  }),
  parent_platforms: PropTypes.arrayOf(
    PropTypes.shape({
      platform: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        slug: PropTypes.string,
      }),
      selected: PropTypes.bool,
    }),
  ),
  reviews_count: PropTypes.number,
});

export const suggestions = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
});

export const ratings = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    percent: PropTypes.number,
    count: PropTypes.number,
  }),
);

export const reviews_users = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
    slug: PropTypes.string,
    full_name: PropTypes.string,
    avatar: PropTypes.string,
    games_count: PropTypes.number,
    collections_count: PropTypes.number,
    review_id: PropTypes.number,
  }),
);

export const owners = PropTypes.shape({
  count: PropTypes.number,
  friends: PropTypes.bool,
  users: PropTypes.array,
});

export const stores = PropTypes.arrayOf(
  PropTypes.shape({
    url: PropTypes.string,
    store: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  }),
);

export const contributors = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.number,
  previous: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      editing_count: PropTypes.number,
      collections_count: PropTypes.number,
      user: PropTypes.shape({
        id: PropTypes.number,
        username: PropTypes.string,
        slug: PropTypes.string,
        full_name: PropTypes.string,
        avatar: PropTypes.string,
        games_count: PropTypes.number,
        collections_count: PropTypes.number,
      }),
    }),
  ),
});

export const charts = PropTypes.shape({
  genre: PropTypes.shape({
    position: PropTypes.number,
    change: PropTypes.string,
    name: PropTypes.string,
  }),
});

export const chartsFull = PropTypes.shape({
  released: PropTypes.shape({
    year: PropTypes.number,
    position: PropTypes.number,
    change: PropTypes.string,
  }),
  toplay: PropTypes.number,
  genre: PropTypes.object,
  person: PropTypes.object,
  full: PropTypes.number,
});

export const youtube = PropTypes.shape({
  count: PropTypes.number,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      description: PropTypes.string,
      external_id: PropTypes.string,
      channel_id: PropTypes.string,
      channel_title: PropTypes.string,
      created: PropTypes.string,
      view_count: PropTypes.number,
      comments_count: PropTypes.number,
      like_count: PropTypes.number,
      dislike_count: PropTypes.number,
      favorite_count: PropTypes.number,
      thumbnails: PropTypes.shape({
        sddefault: PropTypes.shape({
          url: PropTypes.string,
          width: PropTypes.number,
          height: PropTypes.number,
        }),
        medium: PropTypes.shape({
          url: PropTypes.string,
          width: PropTypes.number,
          height: PropTypes.number,
        }),
        default: PropTypes.shape({
          url: PropTypes.string,
          width: PropTypes.number,
          height: PropTypes.number,
        }),
        maxresdefault: PropTypes.shape({
          url: PropTypes.string,
          width: PropTypes.number,
          height: PropTypes.number,
        }),
        high: PropTypes.shape({
          url: PropTypes.string,
          width: PropTypes.number,
          height: PropTypes.number,
        }),
      }),
    }),
  ),
  loading: PropTypes.bool,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
});

export const persons = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
      image: PropTypes.string,
      image_background: PropTypes.string,
      games_count: PropTypes.number,
      games: PropTypes.arrayOf(
        PropTypes.shape({
          id,
          slug,
          name,
          released,
          platforms,
          dominant_color,
          saturated_color,
          background_image,
          rating_top,
          ratings,
          added,
          user_game,
          user_review,
          parent_platforms,
          reviews_count,
          charts: chartsFull,
        }),
      ),
    }),
  ),
});

export const imgur = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      external_id: PropTypes.string,
      name: PropTypes.string,
      description: PropTypes.string,
      created: PropTypes.string,
      image: PropTypes.string,
      url: PropTypes.string,
      view_count: PropTypes.number,
      comments_count: PropTypes.number,
      thumbnail: PropTypes.string,
      thumbnails: PropTypes.shape({
        medium: PropTypes.string,
        default: PropTypes.string,
      }),
    }),
  ),
});

export const achievements = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      description: PropTypes.string,
      image: PropTypes.string,
      percent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ),
});

export const redditResult = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  text: PropTypes.string,
  image: PropTypes.string,
  url: PropTypes.string,
  username: PropTypes.string,
  username_url: PropTypes.string,
  created: PropTypes.string,
});

export const reddit = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
  results: PropTypes.arrayOf(redditResult),
});

export const twitch = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      external_id: PropTypes.number,
      name: PropTypes.string,
      description: PropTypes.string,
      created: PropTypes.string,
      published: PropTypes.string,
      thumbnail: PropTypes.string,
      view_count: PropTypes.number,
      language: PropTypes.string,
    }),
  ),
});

export const reviews = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      external_id: PropTypes.number,
      name: PropTypes.string,
      description: PropTypes.string,
      created: PropTypes.string,
      published: PropTypes.string,
      thumbnail: PropTypes.string,
      view_count: PropTypes.number,
      language: PropTypes.string,
    }),
  ),
});

export const posts = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      external_id: PropTypes.number,
      name: PropTypes.string,
      description: PropTypes.string,
      created: PropTypes.string,
      published: PropTypes.string,
      thumbnail: PropTypes.string,
      view_count: PropTypes.number,
      language: PropTypes.string,
    }),
  ),
});

export const event = PropTypes.shape({
  id: PropTypes.number.isRequired,
  action: PropTypes.oneOf(['add', 'update', 'delete']).isRequired,
  created: PropTypes.string.isRequired,
  event_type: PropTypes.oneOf([
    'screenshot',
    'description',
    'release_date',
    'genres',
    'tags',
    'categories',
    'developers',
    'publishers',
    'posts',
    'comments',
    'stores',
    'website',
    'collections',
    'youtube',
    'twitch',
    'platforms',
  ]).isRequired,
});

export const events = PropTypes.shape({
  count: PropTypes.number,
  next: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  previous: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
  results: PropTypes.arrayOf(event),
});

export const gameTypeObj = {
  id,
  name,
  slug,
  image,
  dominant_color,
  saturated_color,
  reviews_count,
  description,
  platforms,
  parent_platforms,
  metacritic,
  released,
  playtime,
  developers,
  categories,
  genres,
  tags,
  additions,
  gameSeries,
  parents,
  publishers,
  screenshots,
  movies,
  clip: clipType,
  collections,
  suggestions,
  imgur,
  achievements,
  reddit,
  twitch,
  reviews,
  posts,
  ratings,
  rating,
  rating_top,
  reviews_users,
  owners,
  background_image,
  background_image_additional,
  added,
  user_game,
  user_review,
  user_collections,
  loading,
  esrb_rating,
  website,
  youtube,
  youtube_count,
  stores,
  contributors,
  charts,
  discussions_count,
  screenshots_count,
  movies_count,
  collections_count,
  achievements_count,
  parent_achievements_count,
  reddit_url,
  reddit_name,
  reddit_description,
  reddit_logo,
  reddit_count,
  twitch_count,
  imgur_count,
  suggestions_count,
  creators_count,
  promo,
  tba,
  updated,
  events,
  iframe,
};

const gameType = PropTypes.shape(gameTypeObj);

export default gameType;
