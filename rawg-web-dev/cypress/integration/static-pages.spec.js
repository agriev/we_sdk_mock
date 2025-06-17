/// <reference types="Cypress" />

import { generalRoutes, generalRoutesNames } from '../server-utils/routes/general-data.js';

context('Static Pages', () => {
  // https://on.cypress.io/interacting-with-elements

  it('welcome page is working', () => {
    cy.server();
    generalRoutes();

    cy.visit('/welcome');
    cy.wait(generalRoutesNames);
    cy.contains('.welcome__title-h1 > span', 'RAWG');
  });
});
