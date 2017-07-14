import React from 'react';
import PropTypes from 'prop-types'
import Paper from 'material-ui/Paper';
import {white, grey800} from 'material-ui/styles/colors';
import typography from 'material-ui/styles/typography';

class InfoBox extends React.Component {

  render() {
    const {color, title, total, units, Icon} = this.props;

    const styles = {
      content: {
        padding: '5px 10px',
        marginLeft: 90,
        height: 80,
        lineHeight: '80px',
        fontSize: 60,
        textAlign: 'right',
        color: 'rgba(0,0,0,.7)',
        position: 'relative'
      },
      number: {
        display: 'block',
        fontWeight: typography.fontWeightMedium,
        fontSize: 18,
        color: grey800
      },
      total: {
        display: 'block',
        fontWeight: 600,
        fontSize: 48,
        lineHeight: '80px',
        height: 90,
        color: grey800,
        width: '100%',
        right: 0,
        top: 0,
      },
      units: {
        fontSize: 24,
        lineHeight: '24px',
        color: 'rgba(0,0,0,.3)',
        paddingTop: 65,
        paddingRight: 10,
        position: 'absolute',
        height: 80,
        textAlign: 'right',
        width: '100%',
        right: 0,
        top: 0,
      },
      remains: {
        display: 'block',
        fontWeight: typography.fontWeightMedium,
        fontSize: 18,
        color: grey800
      },
      text: {
        fontSize: 20,
        top: 5,
        left: 0,
        color: 'rgba(255,255,255,0.7)',
        position: 'absolute',
        textAlign: 'center',
        width: '100%',
      },
      iconSpan: {
        position: 'relative',
        float: 'left',
        height: 90,
        width: 90,
        textAlign: 'center',
        backgroundColor: color
      },
      icon: {
        height: 48,
        width: 48,
        marginTop: 30,
        maxWidth: '100%',
        fill: 'rgba(255,255,255,0.7)',
      }
    };

    return (
      <Paper>
        <span style={styles.iconSpan}>
          <span style={styles.text}>{title}</span>
          <Icon color={white}
                style={styles.icon}
          />
        </span>

        <div style={styles.content}>
          <div style={styles.total}>{total}</div>
          <div style={styles.units}>{units}</div>
          {/*<span style={styles.negative}>-</span><span style={styles.total}>{allocated}</span>
          <hr/>
          <span style={styles.remains}>{total - allocated}</span>*/}
        </div>
      </Paper>
      );
  }
}

InfoBox.propTypes = {
  Icon: PropTypes.any, // eslint-disable-line
  color: PropTypes.string,
  title: PropTypes.string,
  total: PropTypes.number,
  units: PropTypes.string,
};

export default InfoBox;
