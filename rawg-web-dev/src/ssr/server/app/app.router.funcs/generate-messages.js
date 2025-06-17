import fs from 'fs';
import path from 'path';

import config from 'config/config';

export default function generateMessages() {
  const messages = {};

  config.locales.forEach((locale) => {
    messages[locale] = {};
  });

  const messageFiles = fs.readdirSync(path.resolve('./src/messages'), 'utf8');

  messageFiles.forEach((messageFile) => {
    const messageFileContent = JSON.parse(fs.readFileSync(path.resolve(`./src/messages/${messageFile}`), 'utf8'));

    config.locales.forEach((locale) => {
      const name = messageFile.split('.')[0];
      const fileMessages = messageFileContent[locale] || {};

      Object.keys(fileMessages).forEach((key) => {
        messages[locale][`${name}.${key}`] = fileMessages[key];
      });
    });
  });

  return messages;
}
