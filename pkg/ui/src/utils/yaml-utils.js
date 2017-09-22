import * as YAML from 'yaml-ast-parser'
import {safeLoad as loadYaml} from 'yaml-ast-parser'
import IntervalTree from 'node-interval-tree'

/**
 * Finds the position [row, column] for a given error within
 * the yaml document contents
 * 
 * @param {*} lines the contents of the yaml document, split into lines
 * @param {*} error the error object
 */
export function getErrorPosition(lines, error) {
  let indent = ''
  let row = 0
  let prefix = ''
  let found = false
  let len = lines.length
  let maxTrace = error.trace.length
  let line = ''

  if (error.errorType === 0) {
    --maxTrace
  }
  for (let i=1; i < maxTrace; ++i) {
    let part = error.trace[i]

    indent = findNextIndent(lines, row, false)
    prefix = `${indent}${part.stepName}:`
    found = false
    for (let j=row; j < len && !found; ++j) {
      line = lines[j]
      if (line.startsWith(prefix)) {
        found = true
        row = j
      }
    }

    if ('arrayPos' in part) {
      // find the indent of the next line
      indent = findNextIndent(lines, row, true)
      prefix = `${indent}-`
      let foundPos = -1
      for (let a=row; a < len && foundPos < part.arrayPos; ++a) {
        line = lines[a]
        if (line.startsWith(prefix)) {
          ++foundPos
          if (foundPos === part.arrayPos) {
            row = a
          }
        }
      }
    }
  }
  return row
}

function findNextIndent(lines, startingLine, isArray) {
  for (let i=startingLine+1, len=lines.length; i < len; ++i) {
    let line = lines[i]
    let trimmed = line.trim()
    let beginsArray = trimmed.startsWith('-')
    if (trimmed.startsWith('#') || (isArray && !beginsArray) || (!isArray && beginsArray)) {
      continue
    } else {
      let indent = line.substr(0, line.length - trimmed.length)
      return indent
    }
  }
  return ''
}

/**
 * Finds the position [row, column] for a given path within
 * the yaml document contents
 * 
 * @param {*} lines the contents of the yaml document, split into lines
 * @param {*} path the path reference
 */
export function getPositionForPath(lines, path) {
  let trace = [{}]
  for (let segment of path.split(/[.]/g)) {
    let parts = segment.split(/\[/)
    let step = {stepName: parts[0]}
    if (parts.length > 1) {
      step.arrayPos = parseInt(parts[1].substr(0, parts[1].length - 1), 10)
    }
    trace.push(step)
  }
  return getErrorPosition(lines, {trace: trace, errorType: -1})
}

/**
 * Gets the [[path, indent]] for a position within the current document
 * as an array of [path, indent] possibilities
 * 
 * @param {*} contents the document text
 * @param {*} row the row of the cursor
 * @param {*} column the column of the cursor
 */
export function getPathAndIndentForPosition(contents, row, column) {

  if (contents) {
    let index = new YamlIndex(contents)
    return index.lookupPathAndIndent(row, column)
  } else {
    return [['.', '']]
  }
}


class YamlIndex {

  constructor(contents, row, col) {
    
    this.ast = loadYaml(contents)
    let lines = this.lines = contents.split(/\n/g, -1)

    this._index = {
      range: new IntervalTree(),
      nodePos: [],
      nodePath: {},
      posToRow: [],
    }
    
    // create index of pos to row,col
    let pos = 0
    for (let s = 0, len=lines.length; s < len; ++s) {
      this._index.posToRow.push([pos, lines[s].length])
      pos += lines[s].length + 1
    }
    this.visit(this.ast)
  }

  lookupPathAndIndent(row, column) {
   
    let finalResult = {paths:[], indent:''}
    let pos = this._index.posToRow[row][0] + column
    let path = '.'
    if (this.rowIsBlank(row)) {
      // when the position result is on a blank line,
      // we may return multiple results
      let adjustedRow = row
      let line, subline, skippedSequenceElement
      do {
        --adjustedRow
        line = this.lines[adjustedRow]
        subline = line.substr(column).match(/^(\s+|\s*-)/)
        if (line.substr(column).match(/^\s*-/)) {
          skippedSequenceElement = true
        }
      } while (line.length < column || subline)

      if (skippedSequenceElement) {
        adjustedRow++
      }

      pos = this._index.posToRow[adjustedRow][0] + column
      let results = this._index.range.search(pos, pos)
      for (let r of results) {
        let node = r[1]
        let resultPath = r[0]
        let [startRow,] = this.positionToRowCol(node.startPosition)
        let nodeIndent = this.lines[startRow].match(/^([\s]*)/)[1]
        if (node.kind === YAML.Kind.SEQ && !node.items) {
          nodeIndent = this.lines[startRow-1].match(/^([\s]*)/)[1] + '  '
        } else if (node.parent && node.parent.kind === YAML.Kind.SEQ && node.parent.items.indexOf(node) === 0) {
          nodeIndent += '  '
        } else if (node.parent && node.parent.kind === YAML.Kind.MAPPING && !('kind' in node)) {
          nodeIndent += '  '
        }
        
        if (column === nodeIndent.length) {
          finalResult.paths.push(resultPath)
        }
      }
    } else {
      // when the position result is not on a blank line,
      // we should be able to return a single result
      let results = this._index.range.search(pos, pos)
      let bestFit = this.ast.endPosition
      for (let r of results) {
        let node = r[1]
        let diff = node.endPosition - node.startPosition
        if (diff < bestFit) {
          bestFit = diff
          path = r[0]
        } else if (diff === bestFit && node.endPosition > pos) {
          bestFit = diff
          path = r[0]
        }
      }
      finalResult.paths.push(path)
    }

    finalResult.indent = this.lines[row].match(/^(\s*)/)[1].substr(0, column)
   
    return finalResult
  }

  visit(node) {
    if (node) {
      switch (node.kind) {
          case YAML.Kind.SCALAR: {
              return this.visitScalar(node);
          }
          case YAML.Kind.MAP: {
              return this.visitMap(node);
          }
          case YAML.Kind.MAPPING: {
              return this.visitMapping(node);
          }
          case YAML.Kind.SEQ: {
              return this.visitSequence(node);
          }
          case YAML.Kind.ANCHOR_REF: {
              return this.visitAnchorRef(node);
          }
          case YAML.Kind.INCLUDE_REF: {
              return this.visitIncludeRef(node);
          }
          default:
      }
      throw new Error(`Kind, ${node.kind} not implemented.`)
    }
  }
  
  indexPositionAndPath(path, parent, node, elementIndex) {
    path = path || '.'
    if (node) {
      if (node.endPosition < node.startPosition) {
        console.error(`unexpected node start/end combination: ${JSON.stringify(node)}`)
      }
    } else if (parent.kind === YAML.Kind.SEQ) {
      let prevItem = null
      if (elementIndex > 0) {
        for (let i=elementIndex-1; i >= 0 && prevItem === null; --i) {
          prevItem = parent.items[i]
        }
      }
      let startPos = (prevItem ? prevItem.endPosition : parent.startPosition) + 1
      let endPos = elementIndex + 1 < parent.items.length ? parent.items[elementIndex+1].startPosition : parent.endPosition
      node = {startPosition: startPos, endPosition: endPos, parent: parent}
    } else if (parent.kind === YAML.Kind.MAPPING) {
      let map = parent.parent
      let startPos, endPos
      if (elementIndex > 0) {
        startPos = map.mappings[elementIndex-1].endPosition
      } else {
        startPos = parent.endPosition
      }
      if (elementIndex + 1 < map.mappings.length) {
        endPos = map.mappings[elementIndex+1].startPosition
      } else {
        endPos = map.endPosition
      }
      node = {startPosition: startPos, endPosition: endPos, parent: parent}
    }

    if (node.parent && node.parent.kind === YAML.Kind.SEQ && !node._adjustedForSequence) {
      // find the position just following the '-' and set start position there
      let [r, c] = this.positionToRowCol(node.startPosition)
      let elementStart = this.lines[r].indexOf('-') + 1
      node.startPosition += (elementStart - c)
      node._adjustedForSequence = true
    // } else if (node.parent && node.parent.kind === YAML.Kind.MAPPING && !node._adjustedForMapping && !('kind' in node)) {
    //   // let [r, c] = this.positionToRowCol(node.startPosition)
    //   node.startPosition += 3
    //   node.endPosition = Math.max(node.endPosition, node.startPosition)
    //   node._adjustedForMapping = true
    }

    if (node !== this.ast) {
      this.adjustEndPosition(node, path)
    }
    this._index.range.insert(node.startPosition, node.endPosition, [path, node])
  }

  visitScalar(node) {
    let path = pathForNode(node) || '.'
    this.indexPositionAndPath(path, node.parent, node)
  }

  visitMapping(node) {
    if (node.value) {
      this.visit(this.visit(node.value))
    } else {
      let path = pathForNode(node) + `.${node.key.value}`
      this.indexPositionAndPath(path, node, null, node.parent.mappings.indexOf(node))
    }
  }
  visitSequence(node) {
    let that = this
    let thisPath = pathForNode(node)
    node.items.forEach(function(n, index) {
      if (n) {
        that.visit(n)
      } else {
        let path = thisPath + `[${index}]`
        that.indexPositionAndPath(path, node, null, index)
      }
    })
    this.indexPositionAndPath(thisPath, node.parent, node)
  }
  visitMap(node) {
    node.mappings.map(n => this.visitMapping(n))
    let path = pathForNode(node)
    this.indexPositionAndPath(path, node.parent, node)
  }
  
  visitAnchorRef(nodeAnchorReference) {
  }
  visitIncludeRef(node) {
  }

  adjustEndPosition(node, path) {
    
    let [startRow,] = this.positionToRowCol(node.startPosition)
    let [endRow, endCol] = this.positionToRowCol(node.endPosition)
    if (node.endPosition > node.startPosition) {
      if (this.lines[endRow].substr(0, endCol).match(/^\s*$/)) {
        node.endPosition -= (endCol + 1)
      }
    } else if (startRow === endRow && endCol < this.lines[endRow].length) {
      node.endPosition += (this.lines[endRow].length - endCol)
    }
  }

  indexFollowingBlank(path, node) {
    // if the next row is blank, index it as a next element in this sequence
    if (node !== this.ast) {
      let [startRow,] = this.positionToRowCol(node.startPosition)
      let [endRow, endCol] = this.positionToRowCol(node.endPosition)
      let blankRow = 0
      // if the node ends the row...
      if (this.lines[endRow].substr(endCol).match(/^\s*$/)) {
        // and is followed by a blank row, or ends with a blank row...
        if (this.rowIsBlank(endRow+1)) {
          blankRow = endRow+1
        } else if (this.rowIsBlank(endRow)) {
          blankRow = endRow
        }

        if (blankRow > 0) {
          let indent = this.lines[startRow].match(/^(\s*).*/)[1]
          if (node.items) {
            path += `[${node.items.length}]`
          }
          this.indexPositionAndPath(path, 
            node, 
            {
              startPosition: Math.min(this.ast.endPosition, node.endPosition + indent.length), 
              endPosition: Math.max(node.endPosition + indent.length, 
                this._index.posToRow[blankRow][0] + this.lines[blankRow].length),
            }
          )
        }
      }
    }
  }

  rowIsBlank(row) {
    return (row < this.lines.length && (this.lines[row].match(/^\s*$/) || this.lines[row] === ''))
  }

  positionToRowCol(position) {
    var max = this._index.posToRow.length - 1
    var min = 0

    while (min <= max) {
      let mid = Math.floor((max + min) / 2)
      let [pos, rowLen] = this._index.posToRow[mid]
      if (position < pos) {
        max = mid - 1
      } else if (position > (pos + rowLen)) {
        min = mid + 1
      } else {
        return [mid, position - pos]
      }
    }
    let lastRow = this._index.posToRow[this._index.posToRow.length - 1]
    if (position > lastRow[0] + lastRow[1]) {
      return [this._index.posToRow.length - 1, lastRow[1]]
    }
    return null
  }
}

function pathForNode(node) {
  let path = ''
  if (node && node.parent) {
    path = pathForNode(node.parent)
    if (node.parent.kind === YAML.Kind.SEQ) {
      let index = node.parent.items.indexOf(node)
      path += `[${index}]`
    } else if (node.parent.kind === YAML.Kind.MAPPING) {
      let key = node.parent.key.value
      path += `.${key}`
    }
  }
  return path
}
