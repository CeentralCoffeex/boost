import { ReactElement, useEffect, useState } from 'react';
import { Box, Paper, Typography, Stack } from '@mui/material';
import Image from '../../../../components/base/Image';
import totalSales from '../../../../assets/images/todays-sales/total-sales.png';
import totalOrder from '../../../../assets/images/todays-sales/total-order.png';
import productSold from '../../../../assets/images/todays-sales/product-sold.png';
import newCustomer from '../../../../assets/images/todays-sales/new-customer.png';

const TodaysSales = (): ReactElement => {
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProductCount(data.length);
        }
      })
      .catch((err) => console.error('Failed to fetch products', err));
  }, []);

  const realData = [
    {
      id: 1,
      icon: totalSales,
      title: '0€',
      subtitle: 'Ventes Totales',
      color: 'warning.main',
    },
    {
      id: 2,
      icon: totalOrder,
      title: '0',
      subtitle: 'Commandes',
      color: 'primary.main',
    },
    {
      id: 3,
      icon: productSold,
      title: productCount.toString(),
      subtitle: 'Produits',
      color: 'secondary.main',
    },
    {
      id: 4,
      icon: newCustomer,
      title: '0',
      subtitle: 'Clients',
      color: 'info.main',
    },
  ];

  return (
    <Paper sx={{ p: { xs: 3, sm: 4 }, height: 1 }}>
      <Typography variant="h5" color="common.white" mb={3}>
        Aperçu du jour
      </Typography>
      
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {realData.map((item) => (
          <Box
            key={item.id}
            sx={{
              flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' },
              minWidth: { xs: 'calc(50% - 8px)', sm: '120px' },
              bgcolor: 'background.default',
              borderRadius: 2,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: `${item.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Image src={item.icon} alt={item.subtitle} width={20} height={20} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography 
                variant="h5" 
                color="common.white" 
                fontWeight={700}
                sx={{ lineHeight: 1.2 }}
              >
                {item.title}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.disabled"
                sx={{ 
                  lineHeight: 1.2,
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.subtitle}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default TodaysSales;
