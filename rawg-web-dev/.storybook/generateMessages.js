export default function generateMessages() {
  const messages = {};

  messages['en'] = {};

  const req = require.context('../src/shared/messages', true, /\.json$/);

  req.keys().forEach(messageFile => {
    console.log(messageFile);

    let messageFileContent = req(messageFile);
    Object.keys(messages).forEach(locale => {
      const name = messageFile.split('.')[1].replace(/\//, '');

      messageFileContent = messageFileContent[locale] || {};

      Object.keys(messageFileContent).forEach(key => {
        messages[locale][`${name}.${key}`] = messageFileContent[key];
      });
    });
  });

  console.log(messages);

  return messages;
}
