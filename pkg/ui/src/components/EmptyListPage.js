import React from 'react'


const images = [
  {
    text: [
      <p>sorry, nothing to see here...</p>,
      <p>other than this volcano:</p>
    ],
    src: require('../images/paper-volcano.png')
  },
  {
    text: [
      <p>sorry, no more of those...</p>,
      <p>perhaps they were eaten by this t-rex:</p>
    ],
    src: require('../images/t-rex.png')
  },
]

var imageIndex = 0

export default function EmptyListPage(props){

  let style = {
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
    ...props.style,
  }

  let image = images[imageIndex++ % images.length]

  let imageStyle = {
    backgroundImage: `url(${image.src})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '350px',
    width: '100%',
    height: 400,
    position: 'absolute',
    top: 100,
    opacity: 0.8,
    ...props.imageStyle,
  }

  return (
    <div 
      style={style}>
      {image.text}
      <div 
        style={imageStyle}/>
    </div>
  )
}
