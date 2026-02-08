import { Chip, LinearProgress, TableCell, TableRow } from '@mui/material';
import { ProductItem } from '../../../../data/product-data';
import { ReactElement } from 'react';

const ProductItemRow = ({ productItem }: { productItem: ProductItem }): ReactElement => {
  return (
    <TableRow>
      <TableCell
        align="left"
        component="th"
        variant="head"
        scope="row"
        sx={{
          color: 'common.white',
          fontSize: 'body1.fontSize',
        }}
      >
        {productItem.id}
      </TableCell>
      <TableCell
        align="left"
        sx={{
          whiteSpace: 'nowrap',
        }}
      >
        {productItem.name}
      </TableCell>
      <TableCell align="left">
        <LinearProgress
          variant="determinate"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          color={productItem.color as any}
          value={productItem.sales}
          sx={{
            bgcolor: 'grey.900',
          }}
        />
      </TableCell>
      <TableCell align="center">
        <Chip
          label={`${productItem.sales}%`}
          color={productItem.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
          variant="outlined"
          size="medium"
        />
      </TableCell>
    </TableRow>
  );
};

export default ProductItemRow;
