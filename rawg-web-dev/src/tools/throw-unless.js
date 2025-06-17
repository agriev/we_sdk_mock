import has from 'lodash/has';

const throwUnless = (interfaces) => (error) => {
  for (const ise in interfaces) {
    if (has(interfaces, ise) && error instanceof interfaces[ise]) {
      return;
    }
  }

  throw error;
};

export default throwUnless;
