

context('Namespace Admin', function(){
  beforeEach(function(){
    cy.login('nsadmin', 'nsadmin')
  })

  it('should only see resources in 2 namespaces', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')
    
    let namespaces = {}
    cy.get('table.filter-table.workloads > tbody')
      .children()
      .children(':nth-child(4)')
      .each(function(td) {
        expect(td.context.innerText).to.match(/kube-system|app-group-1/)
      })
  })
})