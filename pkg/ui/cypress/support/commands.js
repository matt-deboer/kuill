// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import url from 'url'

const BASE_URL = url.format({
  protocol : process.env.PROTOCOL || 'http',
  hostname : process.env.HOST || 'localhost',
  port     : process.env.PORT || 3000
})

Cypress.Commands.add("login", (username, password) => {
  cy.visit(BASE_URL)
  cy.get('#username').type('admin')
  cy.get('#password').type('password')
  cy.get('#login').click()
  cy.get('.overview .namespace-panel > .title').should('contain.text', 'Allocated Resource Usage')
})

