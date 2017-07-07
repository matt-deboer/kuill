import React from 'react'
import { grey100, grey300, grey500 } from 'material-ui/styles/colors'

export default function KindAbbreviation(props) {

  let size = props.size || 64
  let background = (!!props.noBackground ? 'transparent' : `url(${require(`../images/Grey-Hexagon.svg`)})`)

  const styles = {
    wrapper: {
      position: 'relative',
      textAlign: 'center',
      display: 'inline-block',
      width: size,
      height: size
    },
    image: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      background: background,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% auto',
    },
    text: {
      position: 'absolute',
      textAlign: 'center',
      width: '100%',
      top: 0,
      left: 0,
      lineHeight: `${size}px`,
    },
    firstLetter: {
      color: props.color || grey100,
      textShadow: `-1px -1px 0 ${grey500},  1px -1px 0 ${grey500}, -1px 1px 0 ${grey500}, 1px 1px 0 ${grey500}`,
      fontWeight: 900,
      fontSize: Math.ceil(40 * size / 64),
    },
    secondLetter: {
      textShadow: `-1px -1px 0 ${grey500},  1px -1px 0 ${grey500}, -1px 1px 0 ${grey500}, 1px 1px 0 ${grey500}`,
      color: grey300,
      fontWeight: 600,
      fontSize: Math.ceil(28 * size / 64),
      marginLeft: Math.ceil(-3 * size / 64),
    },
  }

  return (
    <div style={{...props.style, ...styles.wrapper}}>
        <div style={styles.image} />
        <div style={styles.text}>
          <span style={styles.firstLetter}>
            {props.text.substring(0,1)}
          </span>
          <span style={styles.secondLetter}>
            {props.text.substring(1,2)}
          </span>
        </div>
    </div>
  )
}