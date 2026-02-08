import { ReactElement } from 'react';
import { Box } from '@mui/material';

import CustomerFulfillment from '../../components/sections/dashboard/customer-fulfilment/CustomerFulfillment';
import TodaysSales from '../../components/sections/dashboard/todays-sales/TodaysSales';
import TopProducts from '../../components/sections/dashboard/top-products/TopProducts';
import TrendingNow from '../../components/sections/dashboard/trending-now/TrendingNow';
import Customers from '../../components/sections/dashboard/customers/Customers';

const Dashboard = (): ReactElement => {
  return (
    <>
      <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={3.5}>
        <Box gridColumn={{ xs: 'span 12', '2xl': 'span 8' }} order={{ xs: 0 }}>
          <TodaysSales />
        </Box>
        <Box gridColumn={{ xs: 'span 12', lg: 'span 4' }} order={{ xs: 1 }}>
          <CustomerFulfillment />
        </Box>
        <Box gridColumn={{ xs: 'span 12', lg: 'span 8' }} order={{ xs: 2 }}>
          <TopProducts />
        </Box>
        <Box gridColumn={{ xs: 'span 12', md: 'span 6' }} order={{ xs: 3 }}>
          <TrendingNow />
        </Box>
        <Box gridColumn={{ xs: 'span 12', md: 'span 6' }} order={{ xs: 4 }}>
          <Customers />
        </Box>
      </Box>
    </>
  );
};

export default Dashboard;
