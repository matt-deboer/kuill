

context('Namespace Admin', function(){
  beforeEach(function(){
    cy.login('admin', 'password')
  })

  it('', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')

    cy.get('.filter').find('svg').click()
    
    let namespaces = {}
    cy.get('table.filter-table.workloads > tbody')
      .children()
      .children(':nth-child(4)')
      .should('satisfy', function(td) {
        return td.textContent === 'kube-system' || td.textContent === 'app-group-1'
      })
  })
})