
import React from 'react'

export default class Actions extends React.Component {
  
  
  
  handleDelete = (resource) => {
    let resources = []
    if (resource) {
      resources.push(resource)
    } else if (this.selectedIds && Object.keys(this.selectedIds).length > 0) {
      for (let id in this.selectedIds) {
        resources.push(this.props.resources[id])
      }
    }

    this.setState({
      selectedResources: resources,
      deleteOpen: true,
      actionsOpen: false,
    })
  }

  handleSuspend = (resource) => {
    let resources = []
    if (resource) {
      resources.push(resource)
    } else if (this.selectedIds && Object.keys(this.selectedIds).length > 0) {
      for (let id in this.selectedIds) {
        let resource = this.props.resources[id]
        if ('replicas' in resource.spec && resource.spec.replicas > 0) {
          resources.push(resource)
        }
      }
    }
    this.setState({
      selectedResources: resources,
      suspendOpen: true,
      actionsOpen: false,
    })
  }

  handleScale = () => {
    this.setState({
      scaleOpen: true,
      actionsOpen: false,
    })
  }

  handleRequestCloseDelete = () => {
    this.setState({
      deleteOpen: false,
      selectedResources: [],
    })
  }

  handleConfirmDelete = () => {
    this.setState({
      selectedResources: [],
      deleteOpen: false,
    })
    this.props.removeResource(...this.state.selectedResources)
    this.handleRowSelection({})
  }

  handleRequestCloseScale = () => {
    this.setState({
      scaleOpen: false,
      hoveredRow: -1,
    })
  }

  handleConfirmScale = (replicas) => {
    this.setState({
      scaleOpen: false,
    })
    if (replicas !== undefined) {
      this.props.scaleResource(this.state.hoveredResource, replicas)
    }
    // TODO: need to perform a targeted edit that only scales...
  }

  handleRequestCloseSuspend = () => {
    this.setState({
      suspendOpen: false,
    })
  }

  handleConfirmSuspend = () => {
    this.setState({
      suspendOpen: false,
    })
    for (let resource of this.state.selectedResources) {
      this.props.scaleResource(resource, 0)
    }
    this.handleRowSelection({})
    this.actionsClicked = false
    // TODO: need to perform a targeted edit that only scales...
  }
}