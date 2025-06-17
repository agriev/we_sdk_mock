import pull from 'lodash/pull';
import storage from 'tools/storage';

const STORAGE_KEY = 'profile-opened-categories';

const categoriesStorage = {
  save(name) {
    const categories = this.get();
    categories.push(name);

    storage.set(STORAGE_KEY, categories);
  },

  remove(name) {
    const categories = this.get();
    pull(categories, name);

    storage.set(STORAGE_KEY, categories);
  },

  toggle(name) {
    const categories = this.get();

    if (categories.includes(name)) {
      this.remove(name);
    } else {
      this.save(name);
    }
  },

  get() {
    const defaultCategories = ['owned', 'playing'];
    const categories = storage.get(STORAGE_KEY);

    if (!categories) {
      storage.set(STORAGE_KEY, defaultCategories);
    } else {
      return categories;
    }

    return defaultCategories;
  },
};

export default categoriesStorage;
