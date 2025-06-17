const passDownProperties = (props, object) => {
  if (typeof props === 'function') {
    return props(object);
  }

  return props;
};

export default passDownProperties;
