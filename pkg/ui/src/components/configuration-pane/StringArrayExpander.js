import React from 'react'
import {white, grey800} from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import Subheader from 'material-ui/Subheader'
import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'
import IconButton from 'material-ui/IconButton'
import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
import './ContainerPanel.css'

const rowHeight = 22
const styles = {
  wrapper: {
    border: '1px solid rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(30, 30, 30, 0.15)',
  },
  subheader: {
    backgroundColor: '#004d99'/*rgb(13, 64, 109)'/*grey500*/,
    color: white,
    width: 'auto',
    margin: '0 -1px 0 -1px',
    lineHeight: '24px',
  },
  table: {
    backgroundColor: 'transparent',
    border: 'transparent',
    padding: 16,
    paddingLeft: 16,
    tableLayout: 'inherit',
  },
  tableRow: {
    height: rowHeight,
  },
  bracket: {
    height: rowHeight,
    fontWeight: 600,
    paddingLeft: 0,
  },
  tableRowKeyCol: {
    padding: '2px 10px 2px 0',
    color: grey800,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    paddingRight: 10,
    height: rowHeight,
    verticalAlign: 'top',
  },
  tableRowVal: {
    // width: '99%',
    whiteSpace: 'normal',
    padding: 2,
    height: rowHeight,
    overflow: 'visible',
  },
  envRowVal: {
    whiteSpace: 'normal',
    padding: 2,
    height: rowHeight,
    overflow: 'visible',
  },
  expander: {
    padding: 0,
    height: 24,
    width: 24,
  },
  popover: {
    border: '1px solid rgba(0,0,0,0.3)',
    backgroundColor: 'rgb(240,240,240)',
  },
  popoverTitle: {
    color: 'rgb(0,0,0)',
    fontWeight: 600,
    borderBottom: '1px solid rgba(0,0,0,0.3)',
    backgroundColor: 'rgba(30, 30, 30, 0.15)',
    fontSize: 13,
    lineHeight: '32px',
    paddingLeft: 16,
    paddingRight: 16,
    marginLeft: -20,
    marginRight: -20,
    marginTop: -20,
    marginBottom: 10,
    width: 'auto',
  }
}

export default class StringArrayExpander extends React.PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      open: false,
    }
  }

  handleTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    })
  }

  handleRequestClose = () => {
    this.setState({
      open: false,
    })
  }

  render() {
  
    let { props } = this
    let { data, title } = props
    let contents = null
    if (data.length === 1) {
      contents = (
        <span className="item-array">
          <span className="quoted-string">{data[0]}</span>
        </span>
      )
    } else {
      contents = (
        <div>
          <IconButton style={styles.expander} onTouchTap={this.handleTouchTap}>
            <IconMore />
          </IconButton>

          <Popover
            open={this.state.open}
            anchorEl={this.state.anchorEl}
            anchorOrigin={{horizontal: 'left', vertical: 'top'}}
            targetOrigin={{horizontal: 'left', vertical: 'bottom'}}
            onRequestClose={this.handleRequestClose}
            style={styles.popover}
          >
            <Paper style={{
              background: 'transparent',
              padding: 20, 
              fontSize: 13,
              maxWidth: `${window.innerWidth - 200}px`,
              maxHeight: `${window.innerHeight - 300}px`,
              overflow: 'auto',
              }}
              zDepth={3}>
              <Subheader style={styles.popoverTitle}>{title}</Subheader>
              <Table style={styles.table} selectable={false} headerStyle={{display: 'none'}}>
                <TableBody displayRowCheckbox={false}>
                  <TableRow style={styles.tableRow} displayBorder={false}>
                      <TableRowColumn style={styles.bracket}>[</TableRowColumn>
                  </TableRow>
                  {data.map((line,index) =>
                    <TableRow key={index} style={styles.tableRow} displayBorder={false}>
                        <TableRowColumn style={styles.tableRowVal}><span className="quoted-string">{line}</span></TableRowColumn>
                    </TableRow>
                  )}
                  <TableRow style={styles.tableRow} displayBorder={false}>
                      <TableRowColumn style={styles.bracket}>]</TableRowColumn>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Popover>
      </div>
      )
    }
    return contents
  }
}
