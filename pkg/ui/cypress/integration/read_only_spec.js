

context('Readonly User', function(){
  beforeEach(function(){
    cy.window().then(win => win.onbeforeunload = undefined)
    cy.login('reader', 'reader')
  })

  afterEach(function(){
    // cy.logout()
  })
  
  it('should be able to request pods and deployments (sanity check)', function() {    
    cy.request('/proxy/api/v1/pods').its('status').should('equal', 200)
    cy.request('/proxy/apis/extensions/v1beta1/deployments').its('status').should('equal', 200)
  })

  it('should only see read-only context actions', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')

    cy.get(`table.filter-table.workloads > tbody 
      tr.Deployment_kube-system_kube-dns
      td.resource-actions > svg`)
      .scrollIntoView().click()
    
    cy.get('div.actions-popover div')
      .children('button.row-action')
      .each(function(button) {
        expect(button.context.className).to.match(/row-action (get|logs)/)
      })
  })

  it('should only see read-only resource actions', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')
    
    cy.get(`table.filter-table.workloads > tbody 
      tr.Deployment_kube-system_kube-dns 
      td.name`)
      .scrollIntoView().click()
    
    cy.get('#resource-info-action').click()
    cy.get('#resource-info-action-items')
      .children()
      .get('.resource-info-action.menu-item')
      .each(function(span) {
        expect(span.context.id).to.equal('resource-info-action:get')
      })
  })
})