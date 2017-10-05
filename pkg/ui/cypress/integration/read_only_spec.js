

context('Namespace Admin', function(){
  beforeEach(function(){
    cy.login('reader', 'reader')
  })

  it('should see resources in all namespaces', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')
    
  })
})