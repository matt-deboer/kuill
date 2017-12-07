

context('Cluster Admin', function(){
  beforeEach(function(){
    cy.login('admin', 'password')
  })

  it('should see all supported actions', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')

    cy.get(`table.filter-table.workloads > tbody 
      tr.Deployment_kube-system_kube-dns 
      td.resource-actions > svg`)
      .scrollIntoView().click()
    
    cy.get('div.actions-popover div')
      .children('button.row-action')
      .each(function(button) {
        expect(button.context.className).to.match(/row-action (edit|logs|terminal|delete|scale|suspend)/)
      })
  })

  it('can launch the terminal pane from the action menu', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')

    cy.get(`table.filter-table.workloads > tbody 
      tr.Deployment_kube-system_kube-dns 
      td.resource-actions > svg`)
      .scrollIntoView().click()
    
    cy.get('div.actions-popover div')
      .children('button.row-action.terminal')
      .click()

    cy.location().should(function(location) {
      expect(location.hash).to.eq('#/workloads/kube-system/Deployment/kube-dns?view=terminal')
    })

    cy.get('.resource-tabs.terminal')
    cy.get('button.terminal-start svg').click()
    cy.wait(500)
    cy.get('.xterm-react.terminal').should('be.visible')
    cy.get('.xterm-react.terminal .terminal.xterm').should('be.visible')
    cy.get('.xterm-react.terminal .terminal.xterm textarea').type('exit{enter}', {force: true})
    cy.get('button.terminal-start').should('be.visible')
  })

  it('can create new resources', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')
    
    cy.get('div.new-workload > button').click()
  })

  it('can launch the logs pane from the action menu', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')

    cy.get(`table.filter-table.workloads > tbody 
      tr.Deployment_kube-system_kube-dns 
      td.resource-actions > svg`)
      .scrollIntoView().click()
    
    cy.get('div.actions-popover div')
      .children('button.row-action.logs')
      .click()

    cy.location().should(function(location) {
      expect(location.hash).to.eq('#/workloads/kube-system/Deployment/kube-dns?view=logs')
    })

    cy.get('.resource-tabs.logs')
    cy.get('.xterm-react.logs').should('be.visible')
  })

})