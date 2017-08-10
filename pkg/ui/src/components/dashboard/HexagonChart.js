import React from 'react'
import d3 from 'd3'
import ReactFauxDOM from 'react-faux-dom'

export default class HexagonChart extends React.PureComponent {

  render() {
    let { items } = this.props

    // let itemCount = 30
    // let items = []
    // for (let i=0; i < itemCount; ++i) {
    //   items.push({name: `i-${i}`, group: group(i, itemCount), label: `${i}_${group(i, itemCount)}`})
    // }

    return renderHexChart(items)
  }
}
/**
 * 
 * @param {Array} items 
 */
function renderHexChart(items) {
  let el = ReactFauxDOM.createElement('div')
  let height = 100

  let itemCount = items.length

  // how many hexes will fit in each size increment?
  // TODO: this is currently pinned to maxWidth: 300; need to model it
  let radius = 15
  if (itemCount <= 11) {
    radius = 26
  } else if (itemCount <= 24) {
    radius = 19
  } else if (itemCount <= 40) {
    radius = 15
  } else if (itemCount <= 96) {
    radius = 10
  } else if (itemCount <= 207) {
    radius = 7
  } else {
    // TODO: too many items; have to start grouping them
    // together by bins
  }
  let rows = Math.floor(height / (1.5 * radius))
  let cols = (itemCount - (itemCount % rows)) / rows
  let width = (cols * radius * 2) + (2 * radius)

  const dx = radius * 2 * Math.sin(Math.PI / 3);
  const dy = radius * 1.5;
  let path_generator = d3.geo.path().projection(d3.geo.transform({
    point: function(x, y) {
      return this.stream.point(x * dx / 2, -(y - (2 - (y & 1)) / 3) * dy / 2)
    }
  }))
  
  let svg = d3.select(el).append('svg').attr('width', width).attr('height', height)
  let vis = svg.append('g').attr('transform', `translate(${radius+2},${radius+2})`)

  let featureCollections = []
  let allFeatures = []
  let borders = []
  let index = 0

  let featuresByGroup = {}
  let hasLabels = false
  let orderedGroups = []
  for (let item of items) {
    let g = ('group' in item ? item.group : '__default__')
    if (!(g in featuresByGroup)) {
      orderedGroups.push(g)
    }
    let features = featuresByGroup[g] = featuresByGroup[g] || []
    let increment = Math.max(Math.floor(((index % rows) - 1) / 2), 0)
    if (!!item.label) {
      hasLabels = true
    }
    let hex = newHex({
      x: Math.ceil(index / rows) + increment,
      y: -(index % rows),
      i: index,
      group: g,
      label: item.label,
      classes: item.classes ? item.classes.join(' ') : '',
      n: neighbors(index, rows, itemCount),
    })
    features.push(hex)
    allFeatures[index]=hex
    ++index
  }

  for (let g of orderedGroups) {
    let features = featuresByGroup[g]
    let fc = {
      type: 'FeatureCollection',
      features: features,
      properties: {
        group: g,
      }
    }

    featureCollections.push(fc) 
    let points = computeBorders(features, allFeatures)
   
    borders.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points,
      },
      properties: {
        group: g,
      }
    })
  }
  
  for (let fc of featureCollections) {

    let eachHex = vis.selectAll('.hex.' + fc.properties.group)
      .data(fc.features).enter()

    eachHex.append('path')
      .attr('class', function(d) { return 'hex ' + d.properties.classes})
      .attr('d', path_generator)

    if (hasLabels) {
      eachHex.append('text')
        .attr("text-anchor", "middle")
        .attr("font-size", "7px")
        .attr("fill", "#FFF")
        .attr("x", function(d) {
            return path_generator.centroid(d)[0]
        })
        .attr("y", function(d) {
            return path_generator.centroid(d)[1]
        })
        .attr('dy', 4)
        .text(function(d){return d.properties.label})
    }
  }

  if (borders.length > 1) {
    for (let border of borders) {
      let b = vis.selectAll('.border.'+border.properties.group)
        .data([border])
        .enter()

      b.append('path')
        .attr('class', 'border '+border.properties.group)
        .attr('d', path_generator)
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("fill", "none")
    }
  }

  return el.toReact()
}

function computeBorders(features, allFeatures) {
  let segments = {}
  let segmentKeysByPoint = {}
  let firstSegment = null
  for (let f of features) {
    for (let j=0; j <6; ++j) {
      let neighborIndex = f.properties.neighbors[j]
      let neighbor = allFeatures[neighborIndex]
      if (!neighbor || f.properties.group !== neighbor.properties.group) {
        let p1 = f.geometry.coordinates[0][j]          
        let p2 = f.geometry.coordinates[0][(j+1)]

        let seg = [p1,p2]
        let key = JSON.stringify(seg)
        let k1 = JSON.stringify(p1)
        let k2 = JSON.stringify(p2)

        let _k1s = segmentKeysByPoint[k1] = segmentKeysByPoint[k1] || []
        _k1s.push(key)
        let _k2s = segmentKeysByPoint[k2] = segmentKeysByPoint[k2] || []
        _k2s.push(key)

        seg._key = key
        seg._k1 = k1
        seg._k2 = k2
        segments[key] = seg
        if (!firstSegment) {
          firstSegment = seg
        }
      }
    }
  }

  let points = []
  let prevPointKey = ''
  let currentSeg = firstSegment
  points.push(currentSeg[0])

  let reversed = false
  let removeCurrentSegment = function(segs, currentSeg) {
    let _filter = function(e) { return e !== currentSeg._key }
    return segs.filter(_filter)
  }

  while (!!currentSeg) {
    delete segments[currentSeg._key]

    segmentKeysByPoint[currentSeg._k1] = removeCurrentSegment(segmentKeysByPoint[currentSeg._k1], currentSeg)
    segmentKeysByPoint[currentSeg._k2] = removeCurrentSegment(segmentKeysByPoint[currentSeg._k2], currentSeg)

    let pointToAdd = prevPointKey === currentSeg._k2 ? currentSeg[0] : currentSeg[1]

    if (reversed) {
      points.unshift(pointToAdd)
    } else {
      points.push(pointToAdd)
    }
    // Now find the next segment
    let pointKey = prevPointKey === currentSeg._k2 ? currentSeg._k1 : currentSeg._k2 
    let nextSegKey = segmentKeysByPoint[pointKey][0]
    prevPointKey = pointKey
    // should only be one key left now...
    currentSeg = segments[nextSegKey]
    if (!currentSeg && !reversed) {
      reversed = true
      currentSeg = firstSegment
      prevPointKey = firstSegment._k1
    }
  }
  return points
}

/**
 * Calculate the neighboring item indicies 
 * for a given item index; note that some 
 * returned indicies may be out of array bounds
 * for items, meaning there is no neighbor present
 * 
 * @param {*} d 
 * @param {*} rows 
 * @param {*} itemCount 
 */
function neighbors(d, rows, itemCount) {
  let n = [
    d - 1 + (rows * (d % rows % 2)),
    d + rows,
    d + 1 + (rows * (d % rows % 2)),
    d + 1 - rows + (rows * (d % rows % 2)), 
    d - rows,
    d - 1 - rows + (rows * (d % rows % 2)),
  ]
  if (d % rows === (rows - 1)) {
    n[2] = n[3] = -1
  } else if (d % rows === 0) {
    n[0] = n[5] = -1
  }
  return n
}

// function group(n, itemCount) {
//   if (n <= (itemCount / 3)) {
//     return 0
//   } else if (n <= (2 * itemCount / 3)) {
//     return 1
//   } else {
//     return 2
//   }
// }

/**
 * 
 *  create a new hexagon
 */
function newHex(d) {
  /* conversion from hex coordinates to rect
  */
  var x, y;
  x = 2 * (d.x + d.y / 2.0);
  y = 2 * d.y;
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[x, y + 2], [x + 1, y + 1], [x + 1, y], [x, y - 1], [x - 1, y], [x - 1, y + 1], [x, y + 2]]]
    },
    properties: {
      label: d.label,
      index: d.i,
      group: d.group,
      neighbors: d.n,
      classes: d.classes,
    }
  };
}

/**
 * Tests whether the provided list of segments is contiguous;
 * i.e., the ending point of one segment matches the starting point of the next segment.
 * @param {Array} segments an array of line segments, in the form of [[x1,y1],[x2,y2]] 
 */
// function segmentsContiguous(segments) {
//   let prevSeg = null
//   let consecutive = 0
//   for (let seg of segments) {
//     if (prevSeg) {
//       if (prevSeg[1][0] === seg[0][0] && prevSeg[1][1] === seg[0][1]) {
//         ++consecutive
//       } else {
//         console.warn(`break after ${consecutive}: [${prevSeg[1][0]},${prevSeg[1][1]}] !== [${seg[0][0]},${seg[0][1]}]`)
//         consecutive = 0
//       }
//     }
//     prevSeg = seg
//   }
//   return consecutive === segments.length
// }