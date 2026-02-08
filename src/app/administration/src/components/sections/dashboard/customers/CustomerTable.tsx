import { useMemo, useEffect, ReactElement } from 'react';
import { Stack, Avatar, Tooltip, Typography, CircularProgress } from '@mui/material';
import {
  GridApi,
  DataGrid,
  GridSlots,
  GridColDef,
  useGridApiRef,
  GridActionsCellItem,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import { rows } from '../../../../data/customer-data';
import { stringAvatar } from '../../../../helpers/string-avatar';
import IconifyIcon from '../../../../components/base/IconifyIcon';
import { currencyFormat } from '../../../../helpers/format-functions';
import CustomPagination from '../../../../components/common/CustomPagination';
import CustomNoResultsOverlay from '../../../../components/common/CustomNoResultsOverlay';

interface Customer {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  'billing-address': string;
  'total-spent': number;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: GridColDef<any>[] = [
  {
    field: 'id',
    headerName: 'ID',
    resizable: false,
    minWidth: 60,
  },
  {
    field: 'name',
    headerName: 'Name',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueGetter: (params: any) => {
      return params.row;
    },
    renderCell: (params: GridRenderCellParams<Customer>) => {
      return (
        <Stack direction="row" gap={1} alignItems="center">
          <Tooltip title={params.row.name} placement="top" arrow>
            <Avatar {...stringAvatar(params.row.name)} />
          </Tooltip>
          <Typography variant="body2">{params.row.name}</Typography>
        </Stack>
      );
    },
    resizable: false,
    flex: 1,
    minWidth: 155,
  },
  {
    field: 'email',
    headerName: 'Email',
    resizable: false,
    flex: 0.5,
    minWidth: 145,
  },
  {
    field: 'phone',
    headerName: 'Phone',
    resizable: false,
    flex: 1,
    minWidth: 115,
  },
  {
    field: 'billing-address',
    headerName: 'Billing Address',
    sortable: false,
    resizable: false,
    flex: 1,
    minWidth: 250,
  },
  {
    field: 'total-spent',
    headerName: 'Total Spent',
    resizable: false,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    flex: 1,
    minWidth: 80,
    valueFormatter: (value) => {
      return currencyFormat(value, { minimumFractionDigits: 2 });
    },
  },
  {
    field: 'actions',
    type: 'actions',
    headerName: 'Actions',
    resizable: false,
    flex: 1,
    minWidth: 80,
    getActions: (params) => {
      return [
        <GridActionsCellItem
          icon={
            <IconifyIcon
              icon="fluent:edit-32-filled"
              color="text.secondary"
              sx={{ fontSize: 'body1.fontSize', pointerEvents: 'none' }}
            />
          }
          label="Edit"
          onClick={() => console.log('Edit', params.id)}
          showInMenu
        />,
        <Tooltip title="Delete">
          <GridActionsCellItem
            icon={
              <IconifyIcon
                icon="fluent:delete-32-regular"
                color="error.main"
                sx={{ fontSize: 'body1.fontSize', pointerEvents: 'none' }}
              />
            }
            label="Delete"
            onClick={() => console.log('Delete', params.id)}
            showInMenu
          />
        </Tooltip>,
      ];
    },
  },
];
const CustomerTable = ({ searchText }: { searchText: string }): ReactElement => {
  const apiRef = useGridApiRef<GridApi>();

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.field !== 'id'),
    [columns],
  );

  useEffect(() => {
    apiRef.current.setQuickFilterValues(
      searchText.split(/\b\W+\b/).filter((word: string) => word !== ''),
    );
  }, [searchText]);

  useEffect(() => {
    const handleResize = () => {
      if (apiRef.current) {
        apiRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [apiRef]);

  return (
    <>
      <DataGrid
        apiRef={apiRef}
        density="standard"
        columns={visibleColumns}
        autoHeight={false}
        rowHeight={56}
        checkboxSelection
        disableColumnMenu
        disableRowSelectionOnClick
        rows={rows}
        onResize={() => {
          apiRef.current.autosizeColumns({
            includeOutliers: true,
            expand: true,
          });
        }}
        initialState={{
          pagination: { paginationModel: { page: 0, pageSize: 4 } },
        }}
        slots={{
          loadingOverlay: CircularProgress as GridSlots['loadingOverlay'],
          pagination: CustomPagination as GridSlots['pagination'],
          noResultsOverlay: CustomNoResultsOverlay as GridSlots['noResultsOverlay'],
        }}
        slotProps={{
          pagination: { labelRowsPerPage: rows.length },
        }}
        sx={{
          height: 1,
          width: 1,
          tableLayout: 'fixed',
          scrollbarWidth: 'thin',
        }}
      />
    </>
  );
};

export default CustomerTable;
