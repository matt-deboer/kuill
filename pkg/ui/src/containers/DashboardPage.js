import React from 'react';
import {blueA200, blueA700, lightBlueA400, lightBlue900} from 'material-ui/styles/colors';

import IconMemory from 'material-ui/svg-icons/hardware/memory'
import IconCPU from 'material-ui/svg-icons/content/select-all'
import IconDisk from 'material-ui/svg-icons/device/storage'
import IconNodes from 'material-ui/svg-icons/navigation/apps'

import Assessment from 'material-ui/svg-icons/action/assessment';


import InfoBox from '../components/dashboard/InfoBox';
import NewOrders from '../components/dashboard/NewOrders';
import MonthlySales from '../components/dashboard/MonthlySales';
import BrowserUsage from '../components/dashboard/BrowserUsage';
import RecentlyProducts from '../components/dashboard/RecentlyProducts';
import globalStyles from '../styles';
import Data from '../data';

const DashboardPage = () => {

  return (
    <div>
      <div className="row">

        <div className="col-xs-6 col-sm-6 col-md-3 col-lg-3 m-b-15 ">
          <InfoBox Icon={IconCPU}
                   color={blueA700}
                   title="cpu"
                   total="960"
                   allocated="236"
                   units="cores"
          />
        </div>


        <div className="col-xs-6 col-sm-6 col-md-3 col-lg-3 m-b-15 ">
          <InfoBox Icon={IconMemory}
                   color={blueA200}
                   title="mem"
                   total="4.2"
                   allocated="1.5"
                   units="TB"
          />
        </div>

        <div className="col-xs-6 col-sm-6 col-md-3 col-lg-3 m-b-15 ">
          <InfoBox Icon={IconDisk}
                   color={lightBlueA400}
                   title="disk"
                   total="12"
                   allocated="2.1"
                   units="TB"
          />
        </div>

        <div className="col-xs-6 col-sm-6 col-md-3 col-lg-3 m-b-15 ">
          <InfoBox Icon={IconNodes}
                   color={lightBlue900}
                   title="nodes"
                   total="32"
          />
        </div>
      </div>

      {/*<div className="row">
        <div className="col-xs-12 col-sm-6 col-md-6 col-lg-6 col-md m-b-15">
          <NewOrders data={Data.dashBoardPage.newOrders}/>
        </div>

        <div className="col-xs-12 col-sm-6 col-md-6 col-lg-6 m-b-15">
          <MonthlySales data={Data.dashBoardPage.monthlySales}/>
        </div>
      </div>*/}

      <div className="row">
        <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 m-b-15 ">
          <RecentlyProducts data={Data.dashBoardPage.recentProducts}/>
        </div>

        <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 m-b-15 ">
          <BrowserUsage data={Data.dashBoardPage.browserUsage}/>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
