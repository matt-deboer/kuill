import 'babel-polyfill'
import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import * as reducers from './state/reducers'
import routes from './routes'
import {applyMiddleware, combineReducers, createStore} from 'redux'
import { ConnectedRouter, routerReducer, routerMiddleware } from 'react-router-redux'
import createHistory from 'history/createHashHistory'
import {createLogger} from 'redux-logger'
import thunk from 'redux-thunk'
import {Route, Switch} from 'react-router-dom'
import App from './containers/App'

import injectTapEventPlugin from 'react-tap-event-plugin'

import './styles.css'
import 'font-awesome/css/font-awesome.css'
import 'flexboxgrid/css/flexboxgrid.css'

injectTapEventPlugin()

// if (process.env.NODE_ENV !== 'production') {

//     {
//         let createClass = React.createClass;
//         Object.defineProperty(React, 'createClass', {
//             set: (nextCreateClass) => {
//                 createClass = nextCreateClass
//             }
//         })
//     }

//   const {whyDidYouUpdate} = require('why-did-you-update')
//   whyDidYouUpdate(React, { include: /FilterTable/ })
// }

const history = createHistory()
const rootReducer = combineReducers({
  ...reducers,
  routing: routerReducer
})
const middleware = applyMiddleware(
  createLogger(),
  routerMiddleware(history),
  thunk
)

const store = createStore(
  rootReducer,
  middleware
)

const RouteWithSubRoutes = ({component: Component, props: componentProps, ...rest}) => (
    <Route {...rest} render={props => (
        <Component {...componentProps} {...props} routes={rest.routes}/>
    )} />
)



render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <App>
                <div>
                    <Switch>
                        {routes.map((route, i) => (
                            <RouteWithSubRoutes key={i} {...route}/>
                        ))}
                    </Switch>
                </div>
            </App>
        </ConnectedRouter>
    </Provider>, document.getElementById('root')
)
