/// <reference types="Cypress" />

context('Connectors', () => {
  beforeEach(() => {
    cy.visit('https://example.cypress.io/commands/connectors');
  });

  it('.each() - iterate over an array of elements', () => {
    // https://on.cypress.io/each
    cy.get('.connectors-each-ul>li').each(($el, index, $list) => {
      console.log($el, index, $list);
    });
  });

  it('.its() - get properties on the current subject', () => {
    // https://on.cypress.io/its
    cy
      .get('.connectors-its-ul>li')
      // calls the 'length' property yielding that value
      .its('length')
      .should('be.gt', 2);
  });

  it('.invoke() - invoke a function on the current subject', () => {
    // our div is hidden in our script.js
    // $('.connectors-div').hide()

    // https://on.cypress.io/invoke
    cy
      .get('.connectors-div')
      .should('be.hidden')
      // call the jquery method 'show' on the 'div.container'
      .invoke('show')
      .should('be.visible');
  });

  it('.spread() - spread an array as individual args to callback function', () => {
    // https://on.cypress.io/spread
    const arr = ['foo', 'bar', 'baz'];

    cy.wrap(arr).spread((foo, bar, baz) => {
      expect(foo).to.eq('foo');
      expect(bar).to.eq('bar');
      expect(baz).to.eq('baz');
    });
  });

  it('.then() - invoke a callback function with the current subject', () => {
    // https://on.cypress.io/then
    cy.get('.connectors-list>li').then(($lis) => {
      expect($lis).to.have.length(3);
      expect($lis.eq(0)).to.contain('Walk the dog');
      expect($lis.eq(1)).to.contain('Feed the cat');
      expect($lis.eq(2)).to.contain('Write JavaScript');
    });
  });
});
