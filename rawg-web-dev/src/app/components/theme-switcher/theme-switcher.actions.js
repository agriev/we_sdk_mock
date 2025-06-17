import cookies from 'browser-cookies';

export const SET_THEME = 'theme-switcher/SET_THEME';

export const themeCookieKey = 'theme';

export function setTheme(theme) {
  cookies.set(themeCookieKey, theme, { expires: 365 });

  return {
    type: SET_THEME,
    data: {
      theme,
    },
  };
}
