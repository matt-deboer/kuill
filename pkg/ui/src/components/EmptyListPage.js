import React from 'react'

export default function EmptyListPage(props){

  let style = {
    ...props.style,
    backgroundColor: 'rgb(180, 180, 180)',
    color: 'rgb(220, 220, 220)',
    fontSize: 30,
    lineHeight: `20px`,
    textAlign: 'center',
    position: 'absolute',
    top: 90,
    width: 'calc(100vw - 85px)',
    left: 15,
    height: 'calc(100vh - 250px)',
  }

  return (
    <div 
      style={style}>
      <p>sorry, nothing to see here...</p>
      <p>other than this volcano:</p>
      <div 
        style={{
          backgroundImage: `url(${require('../images/paper-volcano.png')})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '350px',
          width: '100%',
          height: 400,
          position: 'absolute',
          top: 100,
          opacity: 0.8,
        }}/>
    </div>
  )
}
