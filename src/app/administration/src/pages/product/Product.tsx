import { ReactElement } from 'react';
import { Box } from '@mui/material';
import ProductList from '../../components/sections/product/ProductList';

const Product = (): ReactElement => {
  return (
    <Box sx={{ pb: 3 }}>
      <ProductList />
    </Box>
  );
};

export default Product;
