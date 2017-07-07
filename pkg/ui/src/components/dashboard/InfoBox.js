import React from 'react';
import PropTypes from 'prop-types'
import Paper from 'material-ui/Paper';
import {white, grey800, grey300} from 'material-ui/styles/colors';
import typography from 'material-ui/styles/typography';

class InfoBox extends React.Component {

  render() {
    const {color, title, total, allocated, units, Icon} = this.props;

    const styles = {
      content: {
        padding: '5px 10px',
        marginLeft: 90,
        height: 80,
        lineHeight: '80px',
        fontSize: 60,
        textAlign: 'right',
        color: 'rgba(0,0,0,.7)',
      },
      units: {
        fontSize: 24,
        color: 'rgba(0,0,0,.3)',
        padding: 10,
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
        fontSize: 32,
        lineHeight: '34px',
        textShadow: `rgb(158, 158, 158) -1px -1px 0px, rgb(158, 158, 158) 1px -1px 0px, rgb(158, 158, 158) -1px 1px 0px, rgb(158, 158, 158) 1px 1px 0px`,
        color: grey800,
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
          {total}<span style={styles.units}>{units}</span>
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
  total: PropTypes.number.isRequired,
  allocated: PropTypes.number.isRequired,
  units: PropTypes.string,
};

export default InfoBox;
