

context('Namespace Admin', function(){
  beforeEach(function(){
    cy.window().then(win => win.onbeforeunload = undefined)
    cy.login('nsadmin', 'nsadmin')
  })

  afterEach(function(){
    // cy.logout()
  })

  it('should be able to request pods and deployments (sanity check)', function() {    
    cy.request('/proxy/api/v1/namespaces/kube-system/pods').its('status').should('equal', 200)
    cy.request('/proxy/apis/extensions/v1beta1/namespaces/kube-system/deployments').its('status').should('equal', 200)
  })
  
  it('should only see resources in 2 namespaces', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')
    
    let namespaces = {}
    cy.get('table.filter-table.workloads > tbody')
      .children('tr')
      .children('td.namespace')
      .each(function(td) {
        expect(td.context.innerText).to.match(/kube-system|app-group-1/)
      })
  })
})