import paths from 'config/paths';

export default {
  getId(user) {
    return user.id;
  },

  // getName({ full_name, username }) {
  //   const name = full_name || username;
  //   return name.length > 20 ? `${name.substr(0, 10)}...` : name;
  // },

  isAuthenticated({ id }) {
    return Boolean(id);
  },

  hasApiKey(user) {
    return Boolean(user.api_description);
  },

  getDeveloperURL(user) {
    if (!this.isAuthenticated(user)) {
      return `${paths.login}/?forward=developer`;
    }

    return this.hasApiKey(user) ? paths.profileApiKey(user.slug) : paths.profileDeveloper(user.slug);
  },

  isBusiness(user) {
    return user.api_group === 'business';
  },
};
