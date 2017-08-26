import React from 'react'
import IconButton from 'material-ui/IconButton'
import IconHelp from 'material-ui/svg-icons/action/help-outline'
import en from './en'

var localeMap = {en: en}

async function textForLocale(locale) {
  if (locale in localeMap) {
    return localeMap[locale]
  } else {
    // code-split loading of locales
    let resolvedLocale = await import(`./${locale}`).catch(error => {
      return 'en'
    }).then(helpText => {
      localeMap[locale] = helpText
      return locale
    })
    // return locale from the map
    return localeMap[resolvedLocale]
  }
}

const styles = {
  button: {
    padding: 0,
    height: 18,
    width: 18,
  },
  icon: {
    color: 'rgba(180,180,180,0.5)',
    height: 20,
    width: 20,
  }
}

export default class Label extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      open: false,
    }
  }

  componentDidMount = () => {
    let { textId } = this.props
    textForLocale(this.props.locale).then(locale => {
      this.setState({ text: locale[textId] })
    })
  }

  render() {
  
    let { id, style, iconStyle } = this.props

    let normalizedId = `help-text-contents--${id}`
    
    return (
      <div style={{...style}}>{this.state.text}</div>
    )
  }
}
