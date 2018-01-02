import 'react'

import * as SwaggerValidator from 'swagger-object-validator'
import { getPathAndIndentForPosition } from '../utils/yaml-utils'
import {safeLoad as loadYamlAST} from 'yaml-ast-parser'


export default class ManifestAutocompleter {

  constructor(swagger, resourceGroup, resource, kubeKinds) {
    this.swagger = swagger
    this.validator = new SwaggerValidator.Handler(swagger)
    this.resourceGroup = resourceGroup
    this.resource = resource
    this.kubeKinds = kubeKinds
    this.completions = {
      kind: Object.entries(this.kubeKinds)
        .filter(([name, kind])=> kind.resourceGroup === resourceGroup)
        .map(([name, kind])=> name),
      '.': {
        kind: {type:'string'},
        apiVersion: {type:'string'},
        metadata: {type:'object'},
      },
    }
  }
 
  getCompletions = (editor, session, pos, prefix, callback) => {
    let contents = editor.getValue()
    let {paths, indent} = getPathAndIndentForPosition(contents, pos.row, pos.column)
    let completions = filterByPrefix(this.completionsForPath(contents, paths, indent), prefix)
    callback(null, completions.map(([completion, path]) => ({ caption: completion.split(/:/)[0], value: completion, meta: path })))
  }

  completionsForPath = (contents, paths, indent) => {
    // may need to have a custom list of completions for some paths
    // if we can know the answer but the swagger spec doesn't restrict
    // it (e.g., '.kind', or '.apiVersion')
    // likewise, '.metadata.namespace' or similar fields might be limited
    // by what the user has rights to see...
    let completions = []
    let doc
    if (contents) {
      doc = loadYamlAST(contents)
    }

    for (let path of paths) {
      if (path === '.') {
        for (let c of this.completionsForRoot(contents, doc, indent)) {
          completions.push([c, path])
        }
      } else if (path === '.kind') {
        for (let c of this.completions.kind) {
          completions.push([c, path])
        }
      } else if (path === '.apiVersion') {
        let kind = getMappingValue(doc, 'kind')
        if (kind !== null) {
          let k = this.kubeKinds[kind]
          if (k) {
            completions.push([k.base.split(/\//g).slice(1).join('/'), path])
          }
        }
      } else {
        let def = this.getObjectDef(doc)
        if (def) {
          let parts = path.substr(1).split(/[.]/g)
          let isArray = false
          for (let i=0, len=parts.length; i < len; ++i) {
            // let part = parts[i].split(/\[/)[0]
            let [,part,arrayPos] = parts[i].match(/(\w+)(?:\[(\d+)\]|\s*)/)
            doc = this.subAST(doc, part, arrayPos)
            if (def.properties) {
              let prop = def.properties[part]
              let type = prop.type === 'array' ? (prop.items.$ref || prop.items.type) : (prop.type || prop.$ref)
              isArray = (prop.type === 'array')
              if (type.startsWith('#/definitions')) {
                let defName = type.substr(14)
                def = this.swagger.definitions[defName]
              } else {
                def = type
              }
            }
          }
          if (def.properties) {
            if (isArray && (!doc || isFirstArrayElement(doc))) {
              indent += '  '
            }
            for (let c of this.propsToCompletions(def.properties, doc, indent)) {
              completions.push([c, path])
            }
          } else if (def === 'boolean') {
            completions.push(['true', path])
            completions.push(['false', path])
          } else if (def === 'string') {
            completions.push(["''", path])
          } else if (def === 'number' || def === 'integer') {
            completions.push(["1", path])
          }
        }
      }
    }

    return completions
  }

  

  subAST(ast, part, arrayPos) {
    if (ast && ast.mappings) {
      let mapping
      for (let m of ast.mappings) {
        if (m.key.value === part) {
          mapping = m.value
          break
        }
      }
      if (mapping && arrayPos) {
        return mapping.items[parseInt(arrayPos, 10)]
      }
      return mapping
    }
    return ast
  }

  getObjectDef(doc) {
    let kind = getMappingValue(doc, 'kind')
    return kind && this.defForKind(kind)
  }

  defForKind(kind) {
    let k = this.kubeKinds[kind]
    if (k) {
      // this is truly terrible :( we may need to just make the definition part of KubeKinds,
      let base = k.version.split(/\//g).map(b=>b.split(/[.]/)[0]).join('.')
      if (!base.includes('.')) {
        base = 'core.' + base
      }
      let fqName = `io.k8s.api.${base}.${kind}`
      let def = this.swagger.definitions[fqName]
      if (def.$ref) {
        fqName = def.$ref.replace(/#\/definitions\//,"")
        def = this.swagger.definitions[fqName]
      }
      
      return def
    }
    return null
  }

  completionsForRoot(contents, doc, indent) {
    if (!!contents && doc.kind !== 0) {
      let kind = getMappingValue(doc, 'kind')
      if (kind !== null) {
        // get top-level properties for kind
        let def = this.defForKind(kind)
        if (def) {
          return this.propsToCompletions(def.properties, doc, indent)
        }
      }
    }
    return this.propsToCompletions(this.completions['.'],null,'')
  }

  propsToCompletions(properties, doc, indent) {
    let props = Object.entries(properties)
    return props.filter(([key, val]) => getMappingValue(doc, key) === null)
      .map( ([key, val]) => {
        if (val.type === 'array') {
          return `${key}:\n${indent}- `
        } else if (val.type === 'object' || val.$ref) {
          return `${key}:\n${indent}  `
        } else {
          return `${key}: `
        }
      })
  }
}

function filterByPrefix(completions, prefix) {
  let lcPrefix = prefix.toLowerCase()
  return completions.filter(([completion, path])=>completion.toLowerCase().startsWith(lcPrefix))
}

function getMappingValue(ast, key) {
  if (ast && ast.mappings) {
    for (let m of ast.mappings) {
      if (m.key.value === key) {
        if (m.value) {
          return m.value.value || m.value.items
        } else {
          return null
        }
      }
    }
  }
  return null
}

function isFirstArrayElement(doc) {
  return doc && doc.parent && doc.parent.items && (doc.parent.items.length === 0)
}