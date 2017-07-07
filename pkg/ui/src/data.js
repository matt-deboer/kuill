import React from 'react';
// import Home from 'material-ui/svg-icons/action/home';
// import Tune from 'material-ui/svg-icons/image/tune';
// import Apps from 'material-ui/svg-icons/navigation/apps';
// import Settings from 'material-ui/svg-icons/action/settings';
import {cyan600, pink600, purple600} from 'material-ui/styles/colors';
import ExpandLess from 'material-ui/svg-icons/navigation/expand-less';
import ExpandMore from 'material-ui/svg-icons/navigation/expand-more';
import ChevronRight from 'material-ui/svg-icons/navigation/chevron-right';
// import LockOpen from 'material-ui/svg-icons/action/lock-open';

const data = {
  // TODO: use the routes for this; be more DRY....
  // menus: [
  //   { text: 'Overview', icon: <Home/>, link: '/overview' },
  //   { text: 'Resources', icon: <Apps/>, link: '/workloads' },
  //   { text: 'Configuration', icon: <Tune/>, link: '/configuration' },
  // ],
  tablePage: {
    items: [
      {type: 'Deployment', name: 'test-deployment-001', status: 'Active, 2 / 3'},
      {type: 'Deployment', name: 'test-deployment-002', status: 'Active, 1 / 1'},
      {type: 'DaemonSet', name: 'test-ds-003', status: 'Active, 5 / 5'},
      {type: 'Pod', name: 'test-pod-005', status: 'Active, 1 / 1'}
    ]
  },
  dashBoardPage: {
    recentProducts: [
      {id: 1, title: 'Samsung TV', text: 'Samsung 32 1080p 60Hz LED Smart HDTV.'},
      {id: 2, title: 'Playstation 4', text: 'PlayStation 3 500 GB System'},
      {id: 3, title: 'Apple iPhone 6', text: 'Apple iPhone 6 Plus 16GB Factory Unlocked GSM 4G '},
      {id: 4, title: 'Apple MacBook', text: 'Apple MacBook Pro MD101LL/A 13.3-Inch Laptop'}
    ],
    monthlySales: [
      {name: 'Jan', uv: 3700},
      {name: 'Feb', uv: 3000},
      {name: 'Mar', uv: 2000},
      {name: 'Apr', uv: 2780},
      {name: 'May', uv: 2000},
      {name: 'Jun', uv: 1800},
      {name: 'Jul', uv: 2600},
      {name: 'Aug', uv: 2900},
      {name: 'Sep', uv: 3500},
      {name: 'Oct', uv: 3000},
      {name: 'Nov', uv: 2400},
      {name: 'Dec', uv: 2780}
    ],
    newOrders: [
      {pv: 2400},
      {pv: 1398},
      {pv: 9800},
      {pv: 3908},
      {pv: 4800},
      {pv: 3490},
      {pv: 4300}
    ],
    browserUsage: [
      {name: 'Chrome', value: 800, color: cyan600, icon: <ExpandMore/>},
      {name: 'Firefox', value: 300, color: pink600, icon: <ChevronRight/>},
      {name: 'Safari', value: 300, color: purple600, icon: <ExpandLess/>}
    ]
  }
};

export default data;
