import path from 'path';
import Express from 'express';
import fs from 'fs';
import fetch from 'node-fetch';

import startsWith from 'lodash/startsWith';

import config from 'config/config';
import logPerfomance from 'tools/log-perfomance';

import { getLocaleFromRequest } from 'ssr/server/app/app.router.funcs/generate-initial-state';

import sendContent from './app.router.funcs/send-content';
import send500 from './app.router.funcs/send500';

const TEMPLATE_FILE_NAME = 'index.html';
const TEMPLATE_AMP_FILE_NAME = 'index.html';
// const TEMPLATE_AMP_FILE_NAME = 'amp.html';

const isAmp = (request) => request.originalUrl.includes('/amp/');

const getXFrameOptions = (request) => {
  if (startsWith(request.path, '/embeds')) {
    return '';
  }

  const referer = request.get('Referrer') || '';
  const regex = /https?:\/\/([^/]+\.)?(rawg\.io|webvisor\.com)/gm;

  if (referer.match(regex)) {
    return '';
  }

  return 'SAMEORIGIN';
};

export default function appRouter(clientCompiler) {
  const router = Express.Router();

  const getTemplateFilename = (request) =>
    path.join(
      clientCompiler ? clientCompiler.outputPath : config.private.buildPath,
      isAmp(request) ? TEMPLATE_AMP_FILE_NAME : TEMPLATE_FILE_NAME,
    );

  const templates = {};

  if (!clientCompiler) {
    templates.standard = fs.readFileSync(`${config.private.buildPath}/${TEMPLATE_FILE_NAME}`, 'utf8');
    templates.amp = fs.readFileSync(`${config.private.buildPath}/${TEMPLATE_AMP_FILE_NAME}`, 'utf8');
  }

  router.get('/favicon.ico', (request, response) => {
    const locale = getLocaleFromRequest(request);

    response.sendFile(path.resolve(`./src/ssr/client/assets/${locale}/favicon.ico`));
  });

  router.get('/download-user-data', async (request, response) => {
    const locale = getLocaleFromRequest(request);
    const { token } = request.cookies;

    if (token) {
      const fileResponse = await fetch(`${config.apiAddress[locale]}/api/users/current/export`, {
        method: 'GET',
        headers: {
          Token: `Token ${token}`,
        },
      });

      if (!fileResponse.ok) {
        response.sendStatus(401);

        return;
      }

      const contentDisposition = fileResponse.headers.get('content-disposition');
      const content = await fileResponse.text();

      response.setHeader('Content-Disposition', contentDisposition);
      response.send(content);

      return;
    }

    response.sendStatus(401);
  });

  router.get('*', (request, response) => {
    /* eslint-disable optimize-regex/optimize-regex */

    logPerfomance.start('entireRequest');

    response.set('X-Frame-Options', getXFrameOptions(request));

    if (clientCompiler) {
      clientCompiler.outputFileSystem.readFile(getTemplateFilename(request), 'utf8', (error, template) => {
        if (error) {
          send500({ request, response, error });
        } else {
          sendContent({ request, response, template });
        }
      });
    } else {
      const template = templates[isAmp(request) ? 'amp' : 'standard'];
      sendContent({ request, response, template });
    }
  });

  return router;
}
