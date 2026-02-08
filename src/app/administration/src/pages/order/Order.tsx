import { ReactElement } from 'react';
import { Box } from '@mui/material';

import TodaysSales from '../../components/sections/dashboard/todays-sales/TodaysSales';
import Customers from '../../components/sections/dashboard/customers/Customers';
import TrendingNow from '../../components/sections/dashboard/trending-now/TrendingNow';
import TopProducts from '../../components/sections/dashboard/top-products/TopProducts';

const Order = (): ReactElement => {
  return (
    <>
      <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={3.5}>
        <Box gridColumn={{ xs: 'span 12' }} order={0}>
          <TodaysSales />
        </Box>
        <Box gridColumn={{ xs: 'span 12', md: 'span 6' }} order={1}>
          <TopProducts />
        </Box>
        <Box gridColumn={{ xs: 'span 12', md: 'span 6' }} order={2}>
          <TrendingNow />
        </Box>
        <Box gridColumn={{ xs: 'span 12' }} order={3}>
          <Customers />
        </Box>
      </Box>
    </>
  );
};

export default Order;
