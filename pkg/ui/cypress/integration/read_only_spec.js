

context('Readonly User', function(){
  beforeEach(function(){
    cy.login('reader', 'reader')
  })

  it('should only see read-only context actions', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')

    cy.get('table.filter-table.workloads > tbody')
      .children('tr:nth-child(1)')
      .children('td:nth-child(11)')
      .click()
    
      cy.get('div.actions-popover div', {timeout: 10000})
      .children('button.row-action')
      .each(function(button) {
        expect(button.context.id).to.match(/row-action:(get|logs)/)
      })
  })

  it('should only see read-only resource actions', function() {
    cy.get('#goto-workloads').click()
    cy.get('.workloads-page')
    cy.get('table.filter-table.workloads > tbody')
      .children('tr:nth-child(1)')
      .children('td:nth-child(3)')
      .click()
    
    cy.get('#resource-info-action').click()
    cy.get('#resource-info-action-items')
      .children()
      .get('.resource-info-action.menu-item')
      .each(function(span) {
        expect(span.context.id).to.equal('resource-info-action:get')
      })
  })
})