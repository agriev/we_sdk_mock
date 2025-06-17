import cookies from 'browser-cookies';

export const SET_ONLY_MY_PLATFORMS = 'switcher-only-my-platforms/SET';

export const onlyMyPlatformsCookieKey = 'only-my-platforms';

export function setOnlyMyPlatforms(enabled) {
  cookies.set(onlyMyPlatformsCookieKey, enabled ? 'true' : 'false', { expires: 365 });

  return {
    type: SET_ONLY_MY_PLATFORMS,
    data: {
      enabled,
    },
  };
}
