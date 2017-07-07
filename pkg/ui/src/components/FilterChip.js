import React from 'react';
import {blueA400, blueA100} from 'material-ui/styles/colors';

import Chip from 'material-ui/Chip';

// use functional component style for representational components
export default function FilterChip(props) {

    let labelText = (
      <span style={{fontWeight: 700}}>
        <span style={{color: blueA400, paddingRight: 3, ...props.prefixStyle}}>{props.prefix}:</span>
        {props.suffix}
      </span>
    )

    return (

        <Chip
          style={{
            margin: '8px 8px 0 0',
            padding: 0,
            float: 'left', 
            pointerEvents: props.isDisabled ? 'none' : undefined 
          }}
          labelStyle={{'lineHeight': '22px', fontSize: '12px'}}
          backgroundColor={props.isFocused ? blueA100 : null}
          onTouchTap={props.onTouchTap}
          onRequestDelete={props.onRequestDelete}
        >
        {labelText}
        </Chip>
    )
  }

