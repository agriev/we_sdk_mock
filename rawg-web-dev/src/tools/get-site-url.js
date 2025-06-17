import config from 'config/config';

const getSiteUrl = (appLocale) => config.clientAddress[appLocale];

export default getSiteUrl;
