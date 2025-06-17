const request = require.context('./', true, /\.svg$/);
const iconNames = request.keys().map((key) => key.split('/')[1]);

const icons = iconNames.reduce((iconsList, iconName) => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const path = require(`./${iconName}`).default;
  const name = iconName.split('.')[0];

  return {
    ...iconsList,
    [name]: path,
  };
}, {});

export default icons;
