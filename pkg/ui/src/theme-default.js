import getMuiTheme from 'material-ui/styles/getMuiTheme';
import {blue600, blue800, grey800} from 'material-ui/styles/colors';

const themeDefault = getMuiTheme({

  palette: {
    primary1Color: blue800,
    // primary2Color: blue900,
    // primary3Color: grey400,
    // accent1Color: pinkA200,
    // accent2Color: grey100,
    // accent3Color: grey500,
    // textColor: darkBlack,
    // alternateTextColor: white,
    // canvasColor: white,
    // borderColor: grey300,
    // disabledColor: fade(darkBlack, 0.3),
    // pickerHeaderColor: cyan500,
    // clockCircleColor: fade(darkBlack, 0.07),
    // shadowColor: fullBlack,
  },
  appBar: {
    height: 57,
    color: blue600
  },
  drawer: {
    width: 230,
    color: grey800
  },
  raisedButton: {
    primaryColor: blue600,
  },
  menuItem: {
    // hoverColor: grey300,
  },
  textField: {
    // textColor: grey100
  }
});


export default themeDefault;