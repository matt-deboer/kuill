import * as moment from 'moment'

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

export function toHumanizedAge(timestamp) {
  let age = Date.now() - Date.parse(timestamp)
  let humanized = moment.duration(age).humanize()
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
