import { doRequest } from './requests'
import { invalidateSession } from './session'
import { addError } from './errors'
import KubeKinds from '../../kube-kinds'
import yaml from 'js-yaml'

import { defaultFetchParams } from '../../utils/request-utils'

export var types = {}
for (let type of [
  'RECEIVE_TEMPLATES',
]) {
  types[type] = `templates.${type}`
}

/**
 * Requests the set of all available resource templates
 */
export function requestTemplates() {
  return async function (dispatch, getState) {
      doRequest(dispatch, getState, 'fetchResourceTemplates', async () => {
        await fetchResourceTemplates(dispatch, getState)
      })
  }
}

async function fetchResourceTemplates(dispatch, getState) {
  
  let templateNames = await fetch(`/templates`, defaultFetchParams
      ).then(resp => {
          if (!resp.ok) {
            if (resp.status === 401) {
              dispatch(invalidateSession())
            } else {
              dispatch(addError(null,'error',`Failed to fetch templates: ${resp.statusText}`))
            }
            return resp
          } else {
            return resp.json()
          }
        }
      )

  let urls = templateNames.map(template => `/templates/${template}`)
  let requests = urls.map(url => fetch(url, defaultFetchParams
    ).then(resp => {
        if (!resp.ok) {
          if (resp.status === 401) {
            dispatch(invalidateSession())
          }
          return resp
        } else {
          return resp.text()
        }
      }
  ))

  let results = await Promise.all(requests)
  let templates = {}

  for (var i=0, len=results.length; i < len; ++i) {
    let result = results[i]
    let name = templateNames[i]
    if (typeof result === 'string') {
      let groupResolved = false
      let template = yaml.safeLoad(result)
      for (let group in KubeKinds) {
        if (template.kind in KubeKinds[group]) {
          templates[group] = templates[group] || {}
          templates[group][name] = result
          groupResolved = true
          break
        }
      }
      if (!groupResolved) {
        console.error(`result for ${urls[i]} has an unknown/unexpected kind '${template.kind}'`)
      }
    } else {
      let url = urls[i]
      let msg = `result for ${url} returned error code ${result.code}: "${result.message}"`
      console.error(msg)
    }
  }
  dispatch({
    type: types.RECEIVE_TEMPLATES,
    templates: templates,
  })
}