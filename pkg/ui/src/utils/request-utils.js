import yaml from 'js-yaml'
import KubeKinds from '../kube-kinds'

export const defaultFetchParams = {
  credentials: 'same-origin',
  timeout: 5000,
}

export async function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export const lastConfigAnnotation = 'kubectl.kubernetes.io/last-applied-configuration'

export function removeReadOnlyFields(resource) {
  delete resource.status
  delete resource.metadata.generation
  delete resource.metadata.creationTimestamp
  delete resource.metadata.resourceVersion
  delete resource.metadata.selfLink
  delete resource.metadata.uid
}

/**
 * Creates a valid patch body (String), compatible with `kubectl apply` functionality
 * 
 * @param {String} contents 
 */
export function createPatch(resource, contents) {
  let patch = (typeof contents === 'string' ? yaml.safeLoad(contents) : contents)
  if ('spec' in patch) {
    patch.spec.$patch = 'replace'
    patch.metadata.$patch = 'replace'
  }
  delete patch.kind
  delete patch.apiVersion
  // These are all read-only fields; TODO: either hide them in the editor, or present some
  // UI feedback indicating that they cannot be changed
  removeReadOnlyFields(patch)
  
  if (!!resource) {
    patch.metadata.annotations[lastConfigAnnotation] = createLastConfigAnnotation(resource)
  }
  return patch
}

export function createPost(contents) {
  let post = yaml.safeLoad(contents)
  removeReadOnlyFields(post)
  return post
}

/**
 * Creates the 'kubectl.kubernetes.io/last-applied-configuration' value
 * to be added when creating a patch
 * 
 * @param {*} resource 
 */
export function createLastConfigAnnotation(resource) {
  let ann = JSON.parse(JSON.stringify(resource))
  ann.metadata.annotations = {}
  delete ann.isFiltered
  if (!ann.apiVersion) {
    ann.apiVersion = getAPIVersion(resource.kind)
  }
  delete ann.status
  delete ann.metadata.generation
  delete ann.metadata.creationTimestamp
  delete ann.metadata.resourceVersion
  delete ann.metadata.selfLink
  delete ann.metadata.uid

  return JSON.stringify(ann)
}

function getAPIVersion(kind) {
  for (let k in KubeKinds) {
    let kinds = KubeKinds[k]
    if (kind in kinds) {
      return kinds[kind].base
    }
  }
}