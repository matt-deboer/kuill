import React from 'react'
// import { GridGenerator, HexGrid, Layout, Path, Hexagon, Text, Pattern, Hex } from 'react-hexgrid'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { blueA400, grey200, blueA100, red900, white } from 'material-ui/styles/colors'
import { zoneLabel } from '../../utils/filter-utils'
import UtilizationPieChart from './UtilizationPieChart'
import d3 from 'd3'
import ReactFauxDOM from 'react-faux-dom'
import './UtilizationHeatmap.css'

const styles = {
  legend: {
    paddingTop: 20,
  },
  wrapper: {
    padding: 15,
    backgroundColor: 'rgb(66,66,66)',
    marginTop: -15,
  },
  utilizationChart: {
    position: 'relative',
    textAlign: 'center',
    height: 100,
    cursor: 'pointer',
  },
  chartBox: {
    width: 360,
    // border: '1px solid rgba(0,0,0,0.1)',
    padding: 5,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
}

const usageQuantiles = [20, 40, 60, 80, 100]

export default class UtilizationHeatmap extends React.PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      selectBy: 'cpu'
    }
    this.handleSelect = this.handleSelect.bind(this)
  }

  handleSelect = (event) => {
    
    event.preventDefault();

    this.setState({
      selectBy: event.currentTarget.dataset.selectBy,
    })
  }

  render() {

    let { items } = this.props
    let itemGroups = {}

    let itemCount = items.length
    let cpuUtilization = {
      usage: 0,
      total: 0,
    }
    let memUtilization = {
      usage: 0,
      total: 0,
    }
    let diskUtilization = {
      usage: 0,
      total: 0,
    }
    for (let n of items) {
      let zone = ''
      if (n.metadata.labels && zoneLabel in n.metadata.labels) {
        zone = n.metadata.labels[zoneLabel]
      }
      let itemGroup = itemGroups[zone] = (itemGroups[zone] || [])
      if (!n.isFiltered) {
        cpuUtilization.total += n.metrics.summary.cpu.total
        memUtilization.total += n.metrics.summary.memory.total
        if (n.metrics.summary.cpu.usage) {
          diskUtilization.total += n.metrics.summary.disk.total || 0
          cpuUtilization.usage += n.metrics.summary.cpu.usage || 0
          memUtilization.usage += n.metrics.summary.memory.usage || 0
          diskUtilization.usage += n.metrics.summary.disk.usage || 0
        }
        let classes = []
        if (n.isFiltered) {
          classes.push('filtered')
        } else {
          for (let metric of ['memory', 'cpu', 'disk']) {
            if (metric in item) {
              for (let q of quantiles) {
                if (n[metric] <= q) {
                  classes.push(metric+'-usage-le-'+q)
                  break
                }
              }
            }
          }
        }
      }
      itemGroup.push(n)
    } 

    // let itemCount = 19
    // for (let i=0; i < itemCount; ++i) {
    //   if (i < (itemCount/3)) {
    //     itemGroups['a'] = itemGroups['a'] || []
    //     itemGroups['a'].push({group: 'a'})
    //   } else if (i < (2*itemCount/3)) {
    //     itemGroups['b'] = itemGroups['b'] || []
    //     itemGroups['b'].push({group: 'b'})
    //   } else {
    //     itemGroups['c'] = itemGroups['c'] || []
    //     itemGroups['c'].push({group: 'c'})
    //   }
    // }

    return (
      <div style={styles.wrapper} className="row">
        <div className={`col-xs-12 col-sm-5 col-md-6 col-lg-6 item-heatmap by-${this.state.selectBy}`}>
          {renderHexChart(itemGroups, itemCount)}
          <div className="legend">
            {usageQuantiles.map(q=><div key={q} className={'usage usage-le-'+q} >{q}</div>)}
          </div>
        </div>

        <div className={`col-xs-12 col-sm-7 col-md-6 col-lg-6 utilization by-${this.state.selectBy}`}>
          <div className="row" style={styles.chartBox}>
            <UtilizationPieChart total={cpuUtilization.total*1000} used={(cpuUtilization.usage)} label={'cpu utilization'}
              style={styles.utilizationChart} className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'cpu'}
              onTouchTap={this.handleSelect}
              />
            <UtilizationPieChart total={memUtilization.total} used={(memUtilization.usage)} label={'memory utilization'}
              style={styles.utilizationChart} className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'mem'}
              onTouchTap={this.handleSelect}
              />
            <UtilizationPieChart total={diskUtilization.total} used={(diskUtilization.usage)} label={'disk utilization'}
              style={styles.utilizationChart} className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'disk'}
              onTouchTap={this.handleSelect}
              />
          </div>
          <div className="selector">
          </div>
        </div>  
      </div>
    )
  }
}

/**
 * 
 * @param {Array} items 
 * @param {*} itemCount 
 * @param {Array} quantiles quantile buckets to compare (as less-than-or-equal-to) the provided metrics
 * @param {Array} metrics names of numeric attributes (on each item) that are bucketed into the above quantiles
 */
function renderHexChart(items, quantiles, metrics) {
  let el = ReactFauxDOM.createElement('div')
  let height = 100

  var d;
  let itemCount = items.length

  // how many hexes will fit in each size increment?
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
  let identity_generator = d3.geo.path().projection(function(d) { return d })
  
  let svg = d3.select(el).append('svg').attr('width', width).attr('height', height)
  let vis = svg.append('g').attr('transform', `translate(${radius+2},${radius+2})`)

  let featureCollections = []
  let borders = []
  let index = 0

  let featuresByGroup = {}
  let hasLabels = false
  for (let item of items) {
    let g = item.group || ''
    let features = featuresByGroup[g] = featuresByGroup[g] || []
    let increment = Math.max(Math.floor(((index % rows) - 1) / 2), 0)
    let item = group[i]
    if (!!item.label) {
      hasLabels = true
    }
    let hex = newHex({
      x: Math.ceil(index / rows) + increment,
      y: -(index % rows),
      i: index,
      group: g,
      label: item.label,
      classes: item.classes.join(' '),
      n: neighbors(index, rows, itemCount),
    })
    features.push(hex)
    ++index
  }

  for (let g in featuresByGroup) {
    let features = featuresByGroup[g]
    let fc = {
      type: 'FeatureCollection',
      features: features,
      properties: {
        group: g,
      }
    }

    featureCollections.push(fc) 
    // compute boundaries/borders
    let segments = []
    let center = identity_generator.centroid(fc)
    for (let f of features) {
      for (let j=0; j <6; ++j) {
        let neighborIndex = f.properties.neighbors[j] - index0
        let neighbor = features[neighborIndex]
        if (!neighbor || f.properties.group !== neighbor.properties.group) {
          let p1 = f.geometry.coordinates[0][j]
          let p2 = f.geometry.coordinates[0][(j+1)%6]
          let angle = Math.acos((p1[0] - center[0]) / lineDistance(center[0],center[1], p1[0],p1[1]))
          if (p1[1] > center[1]) {
              angle = Math.PI + Math.PI - angle;
          }
          let segment = [p1, p2]
          segment._angle = angle
          segments.push(segment)
        }
      }
    }
    segments.sort((a,b)=>{ return a._angle - b._angle})
    
    let points = []
    for (let seg of segments) {
      points.push(seg[0])
    }
    points.push(segments[segments.length-1][1])

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

  for (let border of borders) {
    let b = vis.selectAll('.border.group_'+border.properties.group)
      .data([border])
      .enter()

    b.append('path')
      .attr('class', 'border group_'+border.properties.group)
      .attr('d', path_generator)
      .attr("stroke", "rgb(41, 121, 255)")
      .attr("stroke-width", 2)
      .attr("stroke-linejoin", "round")
      .attr("fill", "none")
  }

  return el.toReact()
}

function lineDistance(x1,y1, x2, y2) {
    var xs = 0;
    var ys = 0;

    xs = x2 - x1;
    xs = xs * xs;

    ys = y2 - y1;
    ys = ys * ys;

    return Math.sqrt(xs + ys);
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

function group(n, itemCount) {
  if (n <= (itemCount / 3)) {
    return 0
  } else if (n <= (2 * itemCount / 3)) {
    return 1
  } else {
    return 2
  }
}

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
function segmentsContiguous(segments) {
  let prevSeg = null
  let consecutive = 0
  for (let seg of segments) {
    if (prevSeg) {
      if (prevSeg[1][0] === seg[0][0] && prevSeg[1][1] === seg[0][1]) {
        ++consecutive
      } else {
        console.warn(`break after ${consecutive}: [${prevSeg[1][0]},${prevSeg[1][1]}] !== [${seg[0][0]},${seg[0][1]}]`)
        consecutive = 0
      }
    }
    prevSeg = seg
  }
  return consecutive === segments.length
}