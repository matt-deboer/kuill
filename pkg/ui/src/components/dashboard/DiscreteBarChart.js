import React from 'react'
import d3 from 'd3'
import PropTypes from 'prop-types'
import ReactFauxDOM from 'react-faux-dom'
import './DiscreteBarChart.css'

export default class DiscreteBarChart extends React.PureComponent {

  static propTypes = {
    /**
     * Called with an object where keys are the selected values
     */
    onSelection: PropTypes.func,
    /**
     * An array of objects {name, value}
     */
    items: PropTypes.array.isRequired,
    /**
     * An object with keys defining the initially selected items
     */
    initialSelection: PropTypes.object,

    min: PropTypes.number,
    max: PropTypes.number,
    buckets: PropTypes.number,
    colorRange: PropTypes.array,
  }

  static defaultProps = {
    onSelection: function() {},
    initialSelection: {},
    min: 0, 
    max: 100, 
    buckets: 10, 
    colorRange: ['rgb(0,88,229)','rgb(247, 202, 24)'],
  }

  constructor(props) {
    super(props)
    this.state = {
      selected: props.initialSelection,
      hovered: null,
    }
    for (let fn of ['handleSelectNamespace']) {
      this[fn] = this[fn].bind(this)
    }
  }

  render() {

    // let items =[
    //   {
    //     name: 'kube-system',
    //     value: 40,
    //   },
    //   {
    //     name: 'demo',
    //     value: 50,
    //   },
    //   {
    //     name: 'default',
    //     value: 30,
    //   },
    //   {
    //     name: 'monitoring',
    //     value: 60,
    //   },
    //   // {
    //   //   name: 'default2',
    //   //   value: 30,
    //   // },
    //   // {
    //   //   name: 'monitoring2',
    //   //   value: 60,
    //   // },
    //   // {
    //   //   name: 'default3',
    //   //   value: 30,
    //   // },
    //   // {
    //   //   name: 'monitoring3',
    //   //   value: 60,
    //   // },
    //   // {
    //   //   name: 'default4',
    //   //   value: 30,
    //   // },
    //   // {
    //   //   name: 'monitoring4',
    //   //   value: 60,
    //   // },
    //   // {
    //   //   name: 'default5',
    //   //   value: 30,
    //   // },
    //   // {
    //   //   name: 'monitoring5',
    //   //   value: 60,
    //   // },
    // ]
    // return this.renderChart(items)

    let { items, min, max, buckets, colorRange } = this.props

    if (this.props.items) {
      return this.renderChart(items, min, max, buckets, colorRange)
    } else {
      return null
    }
  }

  handleSelectNamespace = (d) => {
    let selection = d[0].x
    let selected
    if (d3.event.shiftKey) {
      selected = {...this.state.selected}
      if (selection in selected) {
        delete selected[selection]
      } else {
        selected[selection]=true
      }
    } else {
      selected = {}
      if (Object.keys(this.state.selected).length > 1 || !(selection in this.state.selected)) {
        selected[selection]=true
      }
    }
    this.setState({selected: selected})
    this.props.onSelection(selected)
  }

  renderChart = (data, min=0, max=100, buckets=10, colorRange=['rgb(0,88,229)','rgb(255,155,26)']) => {
    

    let el = ReactFauxDOM.createElement('div')
    el.setAttribute('class', 'discrete-barchart')

    if (!(max > 0)) {
      return el.toReact()
    }

    let anySelected = Object.keys(this.state.selected).length > 0
    let selected = this.state.selected
    let increment = ((max - min) / buckets) 

    let keys = []
    for (let i=(min+increment); i <= max + 0.1; i += increment ) {
      let key = `le-${i}`
      keys.push(key)
      for (let item of data) {
        item._bins = item._bins || {}
        item._bins[key] = item.value >= (i - increment) ? 1 : 0
      }
    }

    let color = d3.scale.linear().domain([1,keys.length])
        .interpolate(d3.interpolate)
        .range(colorRange)

    let colors = []
    for (let i=0; i < keys.length; ++i) {
      colors.push(color(i))
    }

    var margin = {top: 10, right: 0, bottom: 70, left: 0}
    var width = (Math.max(300, 55* data.length)) - margin.left - margin.right
    var height = 150 - margin.top - margin.bottom - 1;

    var svg = d3.select(el)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    let dataset = d3.layout.stack()(data.map(function(d){
      let dy=0
      return keys.map(function(key) {
        return {x: d.name, y: d._bins[key], dy: dy++}
      })
    }))


    // Set x, y and colors
    var x = d3.scale.ordinal()
      .domain(dataset.map(function(d) { return d[0].x }))
      .rangeRoundBands([10, width], 0.20)

    var y = d3.scale.linear()
      .domain([0,20])
      .range([height, 0])

    var xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom')

      // Prep the tooltip bits, initial display is hidden
    var tooltip = svg.append('g')
      .attr('class', 'tooltip')
      .style('display', 'none')
        
    tooltip.append('rect')
      .attr('width', 30)
      .attr('height', 20)
      .attr('fill', 'white')
      .style('opacity', 0.5)

    tooltip.append('text')
      .attr('x', 15)
      .attr('dy', '1.2em')
      .style('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')

    // Create groups for each series, rects for each segment 
    var groups = svg.selectAll('g.group')
      .data(dataset)
      .enter()
      .append('g')
      .attr('class', function(d, i) {
        let className = 'group'
        if (anySelected) {
          if (d[0].x in selected) {
            className += ' selected'
          } else {
            className += ' deselected'
          }
        }
        return className
      })
      .style('stroke-width', 2)
      .style('stroke-linejoin', 'round')
      .on('mouseup', this.handleSelectNamespace)

    groups.selectAll('rect.hover')
      .data(function(d) { 
        let max = null
        for (let di of d) {
          if (di.y === 1) {
            max = di
          } else {
            break
          }
        }
        return [max]
      })
      .enter()
      .append('rect')
      .attr('class', 'hover')
      .style('fill', 'none')
      .style('stroke', 'none')
      .attr('x', function(d) { return x(d.x); })
      .attr('y', function(d) { return 0 /*y(d.y) - y(d.dy + d.y0)*/ })
      .attr('width', x.rangeBand())
      .attr('height', function(d) {
        return y(buckets) + y(-10)/*y(d.dy)*/
      })
      
    groups.selectAll('rect')
      .data(function(d) { return d})
      .enter()
      .append('rect')
      .style('fill', function(d,) { return colors[d.dy] })
      .style('stroke', function(d) { return colors[d.dy] })
      .attr('class', function(d) { return `dy_${d.dy} y0_${d.y0} y_${d.y}` })
      .attr('x', function(d) { return x(d.x) + 5 })
      .attr('y', function(d) { return y(d.dy + d.y + (d.dy)) + y(-1) })
      .attr('height', function(d) { return y(d.dy + d.y0) - y(d.dy + d.y0 + d.y) })
      .attr('width', function() {
        let xrb = x.rangeBand()
        return xrb - 10
      }())

    groups.selectAll('rect.highlight')
      .data(function(d) { 
        let max = null
        for (let di of d) {
          if (di.y === 1) {
            max = di
          } else {
            break
          }
        }
        return [max]
      })
      .enter()
      .append('rect')
      .attr('class', 'highlight')
      .attr('x', function(d) { return x(d.x) + (x.rangeBand() / 2) - 10 })
      .attr('y', function(d) { return 5})
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', 20)
      .attr('height', function(d) {
        return y(buckets) + y(-7.5)
      })


    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + (height-5) + ')')
      .call(xAxis)
      .attr('font-size', '12px')

    let rotation = 90
    svg.selectAll('g.x.axis g.tick text')
      .attr('transform', `rotate(-${rotation}, 25, 40)`)
      .style('text-anchor', 'left')

    return el.toReact()
  }

}