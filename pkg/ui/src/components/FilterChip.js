import React from 'react';
import { blueA400, blueA100 } from 'material-ui/styles/colors';
import { Link } from 'react-router-dom'
import Chip from 'material-ui/Chip';

// use functional component style for representational components
export default function FilterChip(props) {

    let labelText = (
      <span style={{fontWeight: 700}}>
        <span style={{color: blueA400, paddingRight: 3, ...props.prefixStyle}}>{props.prefix}:</span>
        {props.suffix}
      </span>
    )

    let onTouchTap = props.onTouchTap
    if (props.link && !onTouchTap) {
      onTouchTap = function(){}
    }

    let chip = (
      <Chip
        style={{...{
          margin: '8px 8px 0 0',
          padding: 0,
          float: 'left', 
          pointerEvents: props.isDisabled ? 'none' : 'all' 
        }, ...props.style}}
        labelStyle={{...{'lineHeight': '22px', fontSize: '12px',...props.labelStyle}}}
        backgroundColor={props.isFocused ? blueA100 : null}
        onTouchTap={onTouchTap}
        onRequestDelete={props.onRequestDelete}
      >
      {labelText}
      </Chip>
      )

    let content
    if (props.link) {
      content = (
        <Link to={props.link}>
          {chip}
        </Link>
      )
    } else {
      content = chip
    }
    
    return content
  }

