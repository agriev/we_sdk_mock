/* eslint-disable spaced-comment */
/// <reference types="Cypress" />

context('Querying', () => {
  beforeEach(() => {
    cy.visit('https://example.cypress.io/commands/querying');
  });

  // The most commonly used query is 'cy.get()', you can
  // think of this like the '$' in jQuery

  it('cy.get() - query DOM elements', () => {
    // https://on.cypress.io/get

    cy.get('#query-btn').should('contain', 'Button');

    cy.get('.query-btn').should('contain', 'Button');

    cy.get('#querying .well>button:first').should('contain', 'Button');
    //              ↲
    // Use CSS selectors just like jQuery
  });

  it('cy.contains() - query DOM elements with matching content', () => {
    // https://on.cypress.io/contains
    cy
      .get('.query-list')
      .contains('bananas')
      .should('have.class', 'third');

    // we can pass a regexp to `.contains()`
    cy
      .get('.query-list')
      .contains(/^b\w+/)
      .should('have.class', 'third');

    cy
      .get('.query-list')
      .contains('apples')
      .should('have.class', 'first');

    // passing a selector to contains will
    // yield the selector containing the text
    cy
      .get('#querying')
      .contains('ul', 'oranges')
      .should('have.class', 'query-list');

    cy
      .get('.query-button')
      .contains('Save Form')
      .should('have.class', 'btn');
  });

  it('.within() - query DOM elements within a specific element', () => {
    // https://on.cypress.io/within
    cy.get('.query-form').within(() => {
      cy.get('input:first').should('have.attr', 'placeholder', 'Email');
      cy.get('input:last').should('have.attr', 'placeholder', 'Password');
    });
  });

  it('cy.root() - query the root DOM element', () => {
    // https://on.cypress.io/root

    // By default, root is the document
    cy.root().should('match', 'html');

    cy.get('.query-ul').within(() => {
      // In this within, the root is now the ul DOM element
      cy.root().should('have.class', 'query-ul');
    });
  });
});
