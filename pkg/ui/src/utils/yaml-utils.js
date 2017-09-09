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