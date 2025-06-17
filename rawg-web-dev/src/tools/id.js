/**
 * Супер-маленький хелпер для того чтобы не писать:
 * intl.formatMessage({ id: 'program.h1_title' }),
 *
 * А писать:
 * intl.formatMessage(id('program.h1_title')),
 */
const id = (value) => ({
  id: value,
});

export default id;
