// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

Cypress.Commands.add("login", (username, password) => {
  cy.visit('/')
  cy.get('.title').should('have.text', 'Authentication Required')
  cy.get('#username').type(username)
  cy.get('#password').type(password)
  cy.get('#login').click()
  cy.get('.overview .namespace-panel > .title', {timeout: 5000})
    .should('contain.text', 'Allocated Resource Usage')
})

