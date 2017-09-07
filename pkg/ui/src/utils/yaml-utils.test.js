import { getErrorPosition } from './yaml-utils'

it('finds position for missing required member', () => {
  
  let error = {
    errorType: 0,
    trace: [
      {stepName: 'fully.qualified.schema.Name'},
      {stepName: 'rules', arrayPos: 1},
      {stepName: 'verbs'}
    ]
  }
  let doc =
`apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  name: sample

# edit rules as necessary
rules:
  - apiGroups:
      - ''
    resources:
      - pods
    verbs:
      - create
  - apiGroups:
      - ''
    resources:
      - configmaps
      - endpoints
    
  `
  let lines = doc.split(/\n/g, -1)
  
  expect(getErrorPosition(lines, error)).toEqual(13)
})

it('finds position for mismatched type member', () => {
  
  let error = {
    errorType: 2,
    trace: [
      {stepName: 'fully.qualified.schema.Name'},
      {stepName: 'rules', arrayPos: 1},
      {stepName: 'resources', arrayPos: 0},
    ]
  }
  let doc =
`apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  name: sample

# edit rules as necessary
rules:
  - apiGroups:
      - ''
    resources:
      - pods
    verbs:
      - create
  - apiGroups:
      - ''
    resources:
      - 0
    
  `
  let lines = doc.split(/\n/g, -1)
  
  expect(getErrorPosition(lines, error)).toEqual(16)
})

it('finds position for extra type', () => {
  
  let error = {
    errorType: 1,
    trace: [
      {stepName: 'fully.qualified.schema.Name'},
      {stepName: 'rules', arrayPos: 1},
      {stepName: 'blerbs'},
    ]
  }
  let doc =
`apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  name: sample

# edit rules as necessary
rules:
  - apiGroups:
      - ''
    resources:
      - pods
    verbs:
      - create
  - apiGroups:
      - ''
    resources:
      - 0
    blerbs:
      pow: 'biff!'
  `
  let lines = doc.split(/\n/g, -1)
  
  expect(getErrorPosition(lines, error)).toEqual(17)
})