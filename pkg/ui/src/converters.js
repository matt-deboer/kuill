// import * as moment from 'moment'
import humanizeDuration from 'humanize-duration'

/**
 * 
 * 
 * @param {Number or String} fromTimestamp 
 * @param {Number or String} toTimestamp 
 */
export function durationInSeconds(fromTimestamp, toTimestamp) {
  let fromSeconds = typeof fromTimestamp === 'number' ? fromTimestamp : Date.parse(fromTimestamp)
  let toSeconds = typeof toTimestamp === 'number' ? toTimestamp : Date.parse(toTimestamp)
  return toSeconds - fromSeconds
}

/**
 * Converts a number to a readable precision, using up to
 * the provided max decimals. 
 * 
 * @param {*} number 
 */
export function fixPrecision(number, maxDecimals=2) {
  if (typeof number === 'number') {
    let marker = 10
    let decimals = 0
    while (number < marker && decimals <= maxDecimals ) {
      marker /= 10
      decimals++
    }
    
    if (number < marker) {
      return Math.round(number)
    } else {
      return number.toFixed(decimals)
    }
  }
}

/**
 * 
 * @param {*} number 
 * @param {*} units 
 */
export function fixUnits(number, units) {
  if (number < 1) {
    switch(units) {
      case 'gibibytes':
        return [number * 1024, 'kibibytes']
      case 'kibibytes':
        return [number * 1024, 'bytes']
      case 'cores':
        return [number * 1000, 'millicores']
      default:
    }
  }
  return [number, units]
}


export function toHumanizedAge(timestampOrAge) {
  let age
  if (typeof timestampOrAge === 'string') {
    age = Date.now() - Date.parse(timestampOrAge)
  } else {
    age = timestampOrAge
  }
  // let humanized = moment.duration(age).humanize()
  let humanized = humanizeDuration(age, {largest: 1})
  return humanized.replace("a few ", "")
}

const keyStr = "ABCDEFGHIJKLMNOP" +
             "QRSTUVWXYZabcdef" +
             "ghijklmnopqrstuv" +
             "wxyz0123456789+/" +
             "="

export function decodeBase64(input) {
  var output = ""
  var chr1, chr2, chr3 = ""
  var enc1, enc2, enc3, enc4 = ""
  var i = 0
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  // var base64test = /[^A-Za-z0-9\+\/\=]/g
  var base64test = /[^A-Za-z0-9+/=]/g
  if (base64test.exec(input)) {
     console.warn("There were invalid base64 characters in the input text.\n" +
           "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
           "Expect errors in decoding.")
  }
  input = input.replace(base64test, "")
  do {
     enc1 = keyStr.indexOf(input.charAt(i++))
     enc2 = keyStr.indexOf(input.charAt(i++))
     enc3 = keyStr.indexOf(input.charAt(i++))
     enc4 = keyStr.indexOf(input.charAt(i++))
     chr1 = (enc1 << 2) | (enc2 >> 4)
     chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
     chr3 = ((enc3 & 3) << 6) | enc4
     output = output + String.fromCharCode(chr1)
     if (enc3 !== 64) {
        output = output + String.fromCharCode(chr2)
     }
     if (enc4 !== 64) {
        output = output + String.fromCharCode(chr3)
     }
     chr1 = chr2 = chr3 = ""
     enc1 = enc2 = enc3 = enc4 = ""
  } while (i < input.length)
  return unescape(output)
}

export function parseUnits(valueWithUnit) {
  let parts = valueWithUnit.match(/([0-9]+)([A-Z)[iBb])/)
  switch (parts[2]) {
    case 'Gi': case 'gibibytes':
      parts[2] = 'gibibytes'
      break
    case 'Mi': case 'mebibytes':
      parts[2] = 'mebibytes'
      break
    case 'Ki': case 'kibibytes':
      parts[2] = 'kibibytes'
      break
    default:
  }
  return parts.slice(1)
}

export function convertUnits(value, baseUnit, targetUnit) {
  let base = baseUnit.split('/')
  let target = targetUnit.split('/')
  
  if (base.length !== target.length) {
    return value
  } else {
    let v = value
    for (let i=0; i < base.length; ++i) {
      let bu = base[i]
      let tu = target[i]
      if (bu !== tu) {
        switch (bu) {
          case "bytes":
            switch (tu) {
              case "kibibytes":
                v = v / 1024
                break
              case "mebibytes":
                v = v / ( 1024 * 1024 )
                break
              case "gibibytes":
                v = v / ( 1024 * 1024 * 1024 )
                break
              default:
            }
            break
          case "kibibytes":
            switch (tu) {
              case "bytes":
                v = v * 1024
                break
              case "mebibytes":
                v = v / 1024
                break
              default:
            }
            break
          case "mebibytes":
            switch (tu) {
              case "kibibytes":
                v = v * 1024
                break
              case "bytes":
                v = v * 1024 * 1024
                break
              default:
            }
            break
          case "gibibytes":
            switch (tu) {
              case "mebibytes":
                v = v * 1024
                break
              case "kibibytes":
                v = v * 1024 * 1024
                break
              case "bytes":
                v = v * 1024 * 1024 * 1024
                break
              default:
            }
            break
          case "cores":
            switch (tu) {
              case "millicores":
                v = v * 1000
                break
              default:
            }
            break
          case "millicores":
            switch (tu) {
              case "cores":
              v = v / 1000
              break
              default:
            }
            break
          default:
        }
      }
    }
    return v
  }
}