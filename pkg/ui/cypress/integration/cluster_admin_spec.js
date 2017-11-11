

context('Cluster Admin', function(){
  beforeEach(function(){
    cy.login('admin', 'password')
  })

  afterEach(function(){
    // cy.logout()
  })

  it('should see all supported actions', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')

    cy.get('table.filter-table.workloads > tbody')
      .children('tr.Deployment_kube-system_kube-dns')
      .children('td.resource-actions')
      .click()
    
    cy.get('div.actions-popover div', {timeout: 10000})
      .children('button.row-action')
      .each(function(button) {
        expect(button.context.id).to.match(/row-action:(edit|logs|exec|delete|scale|suspend)/)
      })
    // cy.get('div.actions-popover div').click(0, -10)
  })

  it('can create new resources', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')
    
    cy.get('div.new-workload > button')
      .click()
  })
})