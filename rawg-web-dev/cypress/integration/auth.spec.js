/// <reference types="Cypress" />

import { generalRoutes, generalRoutesNames } from '../server-utils/routes/general-data';
import { authRoutes, authRoutesNames } from '../server-utils/routes/auth';

const getters = {
  inputs: {
    email: 'input[name="email"]',
    pass: 'input[name="password"]',
  },
  submitBtn: '#login-form button[type="submit"]',
};

context('Authrorization', () => {
  // https://on.cypress.io/interacting-with-elements

  it('successful', () => {
    cy.server();
    generalRoutes();
    authRoutes();

    cy.visit('/login');
    cy.wait(generalRoutesNames);

    cy.get(getters.inputs.email).type('testuser3@mail.ru');
    cy.get(getters.inputs.pass).type('ghbdtn.pth');
    cy.get(getters.submitBtn).click();
    cy.wait(authRoutesNames);

    cy.location('pathname').should('eq', '/');
  });
});
