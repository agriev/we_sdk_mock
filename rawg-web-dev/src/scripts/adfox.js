import React from 'react';

export const ADFOX_CODES = {
  '240x400': {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Desktop / Sidebar_left_240x400-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Sidebar-->
    `,

    devices: ['desktop', 'tablet'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'ctxja',
      p2: 'gyyd',
    },
  },

  billboard_desktop: {
    comments: `
        <!--AdFox START-->
        <!--axelspringer-->
        <!--Площадка: Forbes / * / *-->
        <!--Тип баннера: 1000x90js новый-->
        <!--Расположение: <верх страницы / перетяжка>-->
      `,

    devices: ['desktop', 'tablet'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'ctxiz',
      p2: 'gyzh',
    },
  },

  billboard_mobile: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Mobile / Mobile header_300x250-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Mobile-->
    `,

    devices: ['phone'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'ctxiw',
      p2: 'gyzk',
    },
  },

  catfish_desktop: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Desktop / Catfish Desktop-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Catfish-->
    `,

    devices: ['desktop', 'tablet'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'ctxjc',
      p2: 'gyzj',
    },
  },

  catfish_mobile: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Mobile / Mobile_Bannerline (Catfish)-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Catfish-->
    `,

    custom: {
      type: 'floorAd',
    },

    devices: ['phone'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'ctxix',
      p2: 'gyzj',
    },
  },

  fullscreen_desktop: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Desktop / FullScreen Desktop-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Fullscreen-->
    `,

    devices: ['desktop', 'tablet'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'ctxjb',
      p2: 'hkzu',
    },
  },

  fullscreen_mobile: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Mobile / Mobile FS-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Fullscreen-->
    `,

    devices: ['phone'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'ctxiy',
      p2: 'hkzu',
    },
  },

  after_article_desktop: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Desktop / Перетяжка после статьи (970х250)-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Billboard-->
    `,

    devices: ['desktop', 'tablet'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'cvnkd',
      p2: 'gyzh',
    },
  },

  after_article_mobile: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Mobile / Mobile после статьи-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Mobile-->
    `,

    devices: ['phone'],

    options: {
      tabletWidth: 830,
      phoneWidth: 480,
      isAutoReloads: false,
    },

    params: {
      p1: 'cvnke',
      p2: 'gyzk',
    },
  },

  game_desktop: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / Браузерные игры / Desktop FS-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Catfish-->
    `,

    devices: ['desktop', 'tablet'],

    options: {
      isAutoReloads: false,
      phoneWidth: 480,
      tabletWidth: 830,
    },

    params: {
      p1: 'cvxld',
      p2: 'gyzj',
    },
  },

  game_mobile: {
    params: {
      blockId: 'R-A-1755590-3',
      renderTo: 'yandex_rtb_R-A-1755590-3',
    },

    variant: 'rtb',
  },

  game_rewarded_desktop: {
    params: {
      blockId: 'R-A-1755590-10',
      renderTo: 'yandex_rtb_R-A-1755590-10',
    },

    variant: 'rtb',
  },

  game_rewarded_mobile: {
    params: {
      blockId: 'R-A-1755590-11',
      renderTo: 'yandex_rtb_R-A-1755590-11',
    },

    variant: 'rtb',
  },

  game_inpage_desktop: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / ! Desktop / Desktop Inpage-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Inpage-->
    `,

    devices: ['desktop', 'tablet'],

    options: {
      isAutoReloads: false,
      phoneWidth: 480,
      tabletWidth: 830,
    },

    params: {
      p1: 'czlze',
      p2: 'gyzl',
    },
  },

  game_inpage_mobile: {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / ! Mobile / Inpage Mobile-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Mobile-->
    `,

    devices: ['phone'],

    options: {
      isAutoReloads: false,
      phoneWidth: 480,
      tabletWidth: 830,
    },

    params: {
      p1: 'czlzf',
      p2: 'gyzk',
    },
  },

  '300x600': {
    comments: `
      <!--AdFox START-->
      <!--yandex_kanobu2020-->
      <!--Площадка: ag.ru / ! Desktop / Sidebar_300x600-->
      <!--Категория: <не задана>-->
      <!--Тип баннера: Sidebar-->
    `,

    devices: ['desktop'],

    options: {
      isAutoReloads: false,
      phoneWidth: 480,
      tabletWidth: 830,
    },

    params: {
      p1: 'dabkj',
      p2: 'gyyd',
    },
  },
};

export const ADFOX_INITIAL_SCRIPT = <script src="https://yastatic.net/pcode/adfox/loader.js" crossOrigin="anonymous" />;
