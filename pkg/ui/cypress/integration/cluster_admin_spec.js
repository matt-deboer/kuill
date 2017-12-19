

context('Cluster Admin', function(){
  beforeEach(function(){
    cy.window().then(win => win.onbeforeunload = undefined)
    cy.login('admin', 'password')
  })

  it('should be able to request pods and deployments (sanity check)', function() {    
    cy.request('/proxy/api/v1/pods').its('status').should('equal', 200)
    cy.request('/proxy/apis/extensions/v1beta1/deployments').its('status').should('equal', 200)
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
    cy.wait(1000)
    cy.get('.xterm-react.terminal').should('be.visible')
    cy.get('.xterm-react.terminal .terminal.xterm').should('be.visible')
    cy.get('.xterm-react.terminal .terminal.xterm textarea').type('exit{enter}', {force: true})
    cy.get('button.terminal-start').should('be.visible')
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

  it('can autocomplete the access/resources search', function() {
    cy.get('#goto-access').click()
    cy.get('.access-page')
    cy.get('.access-page .access-tabs.resources').click({force: true})

    cy.get('.access-page .filters.resources input[name=filters]').type('{downarrow}', {force: true})

    cy.get('.filters.resources.autocomplete')
      .children('div')
      .each(function(div) {
        expect(div.context.innerText).to.match(/^(kind|role|subject|namespace):.*/)
      })
    
    cy.get('.access-page .filters.resources input[name=filters]').type('subject:system:masters{enter}{esc}', {force: true})
    cy.get(`table.filter-table.access > tbody 
        tr.ClusterRoleBinding_-_cluster-admin`)
  })

  it('can autocomplete the access/subjects search', function() {
    cy.get('#goto-access').click()
    cy.get('.access-page')
    cy.get('.access-page .access-tabs.subjects').click({force: true})

    cy.get('.access-page .filters.subjects input[name=filters]').type('{downarrow}', {force: true})

    cy.get('.filters.subjects.autocomplete')
      .children('div')
      .each(function(div) {
        expect(div.context.innerText).to.match(/^(Group|User):.*/)
      })
    
    cy.get('.access-page .filters.subjects input[name=filters]').type('User:reader{enter}{esc}', {force: true})
        cy.get('.permissions.user')
  })

  it('can create (and delete) a new workload resource', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')
    
    cy.get('div.new-workload > button').click()
    cy.get('button.selected-template').click()
    cy.get('.selected-template-item.Pod').click()
    cy.get('.replace-with-template').click()

    cy.get('.ace_content .ace_line:nth-of-type(5)').click('right', {force: true})
    cy.get('textarea.ace_text-input').type(`${"{backspace}".repeat(6)}bashful{downarrow}`,{force: true})

    cy.get('.ace_content .ace_line:nth-of-type(6)').click('right', {force: true})
    cy.get('textarea.ace_text-input').type(`${"{backspace}".repeat(7)}bashful{downarrow}`,{force: true})

    cy.get('.ace_content .ace_line:nth-of-type(7)').click('right', {force: true})
    cy.get('textarea.ace_text-input').type(`${"{backspace}".repeat(12)}default${"{downarrow}".repeat(3)}`,{force: true})

    cy.get('.ace_content .ace_line:nth-of-type(10)').click('right', {force: true})
    cy.get('textarea.ace_text-input').type(`${"{backspace}".repeat(15)}"bash:4"${"{downarrow}".repeat(2)}`,{force: true})

    cy.get('.ace_content .ace_line:nth-of-type(12)').click('right', {force: true})
    cy.get('textarea.ace_text-input').type(`${"{backspace}".repeat(6)}bashful
`,{force: true})
    cy.get('textarea.ace_text-input').type(`command:
- "sleep"
"999999"` ,{force: true})

    cy.get('.editor-apply button').click()
    cy.get('.resource-info')
    cy.get('.resource-status .status.ok')

    cy.get('#resource-info-action').click()
    cy.get('.resource-info-action-items')
    cy.get('.resource-info-action.delete').click()
    cy.get('.confirmation.confirm button').click()
    cy.get('.workloads-page')

  })

})