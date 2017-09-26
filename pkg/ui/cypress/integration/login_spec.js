describe('Login', function(){
  it('should require authentication', function(){
    cy.visit('http://localhost:3000')

    cy.get('.title').should('have.text', 'Authentication Required')

    cy.login('admin', 'password')
  })
})
