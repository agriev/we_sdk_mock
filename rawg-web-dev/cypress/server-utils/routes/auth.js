/// <reference types="Cypress" />

import addEmailSymbol from '../add-email-symbol.js';

const login = 'postLogin';

const processLogin = (routeData) => {
  return '{"key":"a527c94514e073722776103d87c9404c7b735b79"}';
};

export const authRoutes = () => {
  cy.route('POST', 'api/auth/login', processLogin).as(login);
};

export const authRoutesNames = [login].map(addEmailSymbol);
