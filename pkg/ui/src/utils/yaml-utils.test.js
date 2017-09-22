import { getErrorPosition, getPositionForPath, getPathAndIndentForPosition } from './yaml-utils'

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

it('finds position for path', () => {
  
  let error = {
    errorType: -1,
    trace: [
      {},
      {stepName: 'metadata'},
      {stepName: 'name'},
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
  
  expect(getPositionForPath(lines, '.metadata.name')).toEqual(3)
})

it('finds path for a position', () => {
  
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
  expect(getPathAndIndentForPosition(doc, 10, 10)).toEqual({paths:['.rules[0].resources[0]'],indent: '      '})
})

it('finds path for a null sequence element', () => {
  
  let doc =
`apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  name: \${name}

# edit rules as necessary
rules:
  - apiGroups:
      - ''
      -
    resources:
      - pods
      - pods/attach
      - pods/exec
      - pods/portforward
      - pods/proxy
    verbs:
      - create
      - delete
      - deletecollection
      - get
      - list
      - patch
      - update
      - watch
`  
  expect(getPathAndIndentForPosition(doc, 9, 7)).toEqual({paths:['.rules[0].apiGroups[1]'],indent: '      '})
})

var nullMappingDoc = `kind: 
` 

it('finds path for a null mapping value: 0,6', () => {
  expect(getPathAndIndentForPosition(nullMappingDoc, 0, 6)).toEqual({paths:['.kind'],indent:''})
})
it('finds path for a null mapping value: 0,5', () => {
  expect(getPathAndIndentForPosition(nullMappingDoc, 0, 5)).toEqual({paths:['.kind'],indent:''})
})

it('finds path for a null mapping value; single-line: 0,6', () => {
  expect(getPathAndIndentForPosition(`kind: `, 0, 6)).toEqual({paths:['.kind'],indent:''})
})

it('finds path for just opened null mapping value', () => {
  
  let doc = `kind:`  
  expect(getPathAndIndentForPosition(doc, 0, 5)).toEqual({paths:['.kind'],indent:''})
})

it('finds correct path for top-level object', () => {
  
  let doc =
`kind: Role
`
  expect(getPathAndIndentForPosition(doc, 1, 0)).toEqual({paths:['.'],indent:''})
})

var partialTopLevelDoc = `kin`

it(`finds correct path for incomplete top-level objects: 0,1`, () => {
  expect(getPathAndIndentForPosition(partialTopLevelDoc, 0, 1)).toEqual({paths:['.'],indent:''})
})

it(`finds correct path for incomplete top-level objects: 0,2`, () => {
  expect(getPathAndIndentForPosition(partialTopLevelDoc, 0, 2)).toEqual({paths:['.'],indent:''})
})

it(`finds correct path for incomplete top-level objects: 0,3`, () => {
  expect(getPathAndIndentForPosition(partialTopLevelDoc, 0, 3)).toEqual({paths:['.'],indent:''})
})

it('finds correct path for incomplete nested objects', () => {
  
  let incompleteNestedObjectsDoc =
`kind: ServiceAccount
apiVersion: api/v1
secrets:
  - name: bob
    `
  // this one gets the correct path, but indent is too small
  expect(getPathAndIndentForPosition(incompleteNestedObjectsDoc, 4, 4)).toEqual({paths:['.secrets[0]'],indent:'    '})
})

var incompleteObjectDoc = 
`kind: Role
apiVersion: rbac.authorization.k8s.io/v1beta1
rules:
  - apiGroups:
    - ''
  - 
  `

it('finds correct path for incomplete objects: 5,4', () => {
  // this one gets the wrong path, but the indent is right
  expect(getPathAndIndentForPosition(incompleteObjectDoc, 5, 4)).toEqual({paths:['.rules[1]'],indent:'  '})
})
it('finds correct path for incomplete objects: 5,3', () => {
  expect(getPathAndIndentForPosition(incompleteObjectDoc, 5, 3)).toEqual({paths:['.rules[1]'],indent:'  '})
})
it('finds correct path for incomplete objects: 5,2', () => {
  expect(getPathAndIndentForPosition(incompleteObjectDoc, 5, 2)).toEqual({paths:['.rules'],indent:'  '})
})
it('finds correct path for incomplete objects: 6,2', () => {
  expect(getPathAndIndentForPosition(incompleteObjectDoc, 6, 2)).toEqual({paths:['.rules'],indent:'  '})
})
it('finds correct path for incomplete objects: 6,0', () => {
  expect(getPathAndIndentForPosition(incompleteObjectDoc, 6, 0)).toEqual({paths:['.'],indent:''})
})

var pathFollowingObjectsDoc =
`kind: Role
rules:
- apiGroups:
  - ''
  nonResourceURLs:
  - ''

`

it('finds correct path after sequences: 5,0', () => {
  expect(getPathAndIndentForPosition(pathFollowingObjectsDoc, 5, 0)).toEqual({paths:['.rules[0]'],indent:''})
})

it('finds correct path after sequences: 6,0', () => {
  expect(getPathAndIndentForPosition(pathFollowingObjectsDoc, 6, 0)).toEqual({paths:['.','.rules'],indent:''})
})

var pathAfterDoc =
`kind: Role 
rules:
- apiGroups:
  - ''
  `

it('finds correct path after sequences: 4,0', () => {
  expect(getPathAndIndentForPosition(pathAfterDoc, 4, 0)).toEqual({paths:['.','.rules'],indent:''})
})

it('finds correct path after sequences: 4,2', () => {
  expect(getPathAndIndentForPosition(pathAfterDoc, 4, 2)).toEqual({paths:['.rules[0]', '.rules[0].apiGroups'],indent:'  '})
})

var pathAfterObjectDoc =
`kind: Role
metadata:
`

it('finds correct path after objects: 2,0', () => {
  expect(getPathAndIndentForPosition(pathAfterObjectDoc, 2, 0)).toEqual({paths:['.'],indent:''})
})

it('finds correct path after objects: 2,0', () => {
  let doc =
`kind: Role
metadata:
  generation: `

  expect(getPathAndIndentForPosition(doc, 2, 14)).toEqual({paths:['.metadata.generation'],indent:'  '})
})