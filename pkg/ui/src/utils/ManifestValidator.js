import React from 'react'


import * as SwaggerValidator from 'swagger-object-validator'
import { getErrorPosition, getPositionForPath } from '../utils/yaml-utils'
import KubeKinds from '../kube-kinds'
import yaml from 'js-yaml'


export default class ManifestValidator {

  constructor(swagger, resourceGroup, detectVariables, resource) {
    this.swagger = swagger
    this.validator = new SwaggerValidator.Handler(swagger)
    this.resourceGroup = resourceGroup
    this.detectVariables = detectVariables
    this.resource = resource
  }
 

  validate = async (contents, testVariables) => {
  
    let lines = (contents && contents.split(/\n/g)) || []
    let errors = []
    if (testVariables && typeof this.detectVariables === 'function') {
      for (let i=0, len=lines.length; i < len; ++i) {
        let line = lines[i]
        let vars = this.detectVariables(line)
        if (vars.length) {
          errors.push({
            row: i,
            column: 0,
            html: this.getHtmlForTemplateVariableError(vars),
            type: 'error'
          })
        }
      }
    }

    if (this.validator) {
      let resource
      try {
        resource = yaml.safeLoad(contents)
        if (this.resource) {
          // none of the 'key' values can be changed on a resource
          if (this.resource.kind !== resource.kind) {
            errors.push({
              row: getPositionForPath(lines, "kind"), 
              column: 0, 
              html: this.getHtmlForCannotChange("kind", this.resource.kind),
              type: 'error'
            })
          }
          if (!resource.metadata || this.resource.metadata.namespace !== resource.metadata.namespace) {
            errors.push({
              row: getPositionForPath(lines, "metadata.namespace"), 
              column: 0, 
              html: this.getHtmlForCannotChange("metadata.namespace", this.resource.metadata.namespace),
              type: 'error'
            })
          }
          if (!resource.metadata || this.resource.metadata.name !== resource.metadata.name) {
            errors.push({
              row: getPositionForPath(lines, "metadata.name"), 
              column: 0, 
              html: this.getHtmlForCannotChange("metadata.name", this.resource.metadata.name),
              type: 'error'
            })
          }
        }
        if ('kind' in resource) {
          let kinds = KubeKinds[this.resourceGroup]
          let kind = kinds[resource.kind]
          if (!!kind) {
            let modelGuess = `io.k8s.apimachinery.pkg.${kind.base.replace(/\//g,'.')}.${resource.kind}`
            
            // TODO: The model version exposed by the swagger spec does not always match
            // the api version exposed--this may be due to exposing multiple versions of
            // the same resource type...
            let actualModel = modelGuess
            let suffix = `.${resource.kind}`
            for (let type in this.swagger.definitions) {
              if (type.endsWith(suffix)) {
                actualModel = type
                break
              }
            }
    
            let result = await this.validator.validateModel(resource, actualModel)
            if (result.errors && result.errors.length) {
              for (let error of result.errors) {
                errors.push({
                  row: getErrorPosition(lines, error) || 0,
                  column: 0,
                  html: this.getHtmlForError(error),
                  type: 'error',
                })
              }
            }
          } else {
            errors.push({
              row: getPositionForPath(lines, "kind"), 
              column: 0, 
              html: this.getHtmlForInvalidValue("kind", resource.kind),
              type: 'error'
            })
          }
        }
      } catch (e) {
        if ('mark' in e) {
          errors.push({row: e.mark.line, column: e.mark.column, text: e.reason, type: 'error'})
        } else if (e) {
          errors.push({row: 0, column: 0, text: e, type: 'error'})
        }
      }
    }
    return errors
  }

  getHtmlForCannotChange = (ref, value) => {
    return (<div><span className="error yaml-ref">{ref} </span>
        cannot be changed from it's original value of
        <span className="error type-ref"> {value} </span>
      </div>)
  }

  getHtmlForInvalidValue = (ref, value) => {
    return (<div><span className="error type-ref">{value} </span>
        is not valid for<span className="error yaml-ref"> {ref} </span>
      </div>)
  }

  getHtmlForError = (error) => {
    let path = ""
    let maxTrace = (error.errorType > 0 ? error.trace.length : error.trace.length - 1)
    for (let i=1; i < maxTrace; ++i) {
      let part = error.trace[i]
      if (!!path) {
        path += '.'
      }
      path += part.stepName
      if ('arrayPos' in part) {
        path += `[${part.arrayPos}]`
      }
    }
    if (error.errorType === 0) {
      if (error.trace.length === 2) {
        return <div><span className="error yaml-ref">{error.trace[maxTrace].stepName} </span>is required</div>
      } else {
        return <div><span className="error yaml-ref">{error.trace[maxTrace].stepName} </span>is required in<span className="error yaml-ref"> {path} </span></div>
      }
    } else if (error.errorType === 2) {
      return (
        <div>
          <span className="error yaml-ref">{path} </span>
          is of the wrong type; expected 
          <span className="error type-ref"> {error.typeShouldBe} </span>
          but found<span className="error type-ref"> {error.typeIs}</span>
        </div>
      )
    } else {
      return <div><span className="error yaml-ref">{path}</span> is not expected for this resource kind</div>
    }
  }

  getHtmlForTemplateVariableError = (vars) => {
    if (vars.length === 1) {
      return (
        <div>
          <span>template variable </span>
          <span className="error variable-ref">${vars[0]}</span>
          <span> needs a value</span>
        </div>
      )
    } else {
      return (
        <div>
          <span>template variables </span>
          {vars.map((v, index) => {
            let joiner = null
            if (index > 0) {
              joiner = <span>, </span>
            }
            return (joiner, <span className="error variable-ref">${v}</span>)
          })}
          <span> need values</span>
        </div>
      )
    }
  }
}