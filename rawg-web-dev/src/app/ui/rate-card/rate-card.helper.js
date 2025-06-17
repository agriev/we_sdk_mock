import exeptionalIcon from 'assets/icons/emoji/exceptional.png';
import mehIcon from 'assets/icons/emoji/meh.png';
import skipIcon from 'assets/icons/emoji/skip.png';
import recommendedIcon from 'assets/icons/emoji/recommended.png';

import trans from 'tools/trans';

export const RATING_EXCEPTIONAL = 5;
export const RATING_RECOMMENDED = 4;
export const RATING_MEH = 3;
export const RATING_SKIP = 1;
export const RATINGS = [RATING_SKIP, RATING_MEH, RATING_RECOMMENDED, RATING_EXCEPTIONAL];

export const buttonsData = [
  {
    label: trans('shared.rating_exceptional'),
    type: 'exceptional',
    icon: exeptionalIcon,
    id: RATING_EXCEPTIONAL,
  },
  {
    label: trans('shared.rating_recommended'),
    type: 'recommended',
    icon: recommendedIcon,
    id: RATING_RECOMMENDED,
  },
  {
    label: trans('shared.rating_meh'),
    type: 'meh',
    icon: mehIcon,
    id: RATING_MEH,
  },
  {
    label: trans('shared.rating_skip'),
    type: 'skip',
    icon: skipIcon,
    id: RATING_SKIP,
  },
];
