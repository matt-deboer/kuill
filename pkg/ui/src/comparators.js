/**
 * Compares 2 arrays for equality; assumes the arrays are already
 * sorted
 * 
 * @param {*} array1 
 * @param {*} array2 
 */
export function arraysEqual(array1, array2) {
  return (!!array1 === !!array2) 
      && (!array1 
          || (array1.length === array2.length 
              && array1.every((element, i) => array2[i] === element)))
}

/**
 * Returns true if the object is undefined/false/null, or has no keys
 * @param {*} obj 
 */
export function objectEmpty(obj) {
  return !obj || Object.keys(obj).length === 0
}
