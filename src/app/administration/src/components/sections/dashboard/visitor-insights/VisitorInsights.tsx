import { Box, Paper, Stack, Typography } from '@mui/material';
import { ReactElement } from 'react';

const VisitorInsights = (): ReactElement => {
  return (
    <Paper sx={{ p: { xs: 4, sm: 8 }, height: 1 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={6}
      >
        <Typography variant="h4" color="common.white">
          Visitor Insights
        </Typography>
      </Stack>
      <Box sx={{ height: '342px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
        <Typography variant="body1">Données réelles non disponibles pour le moment.</Typography>
      </Box>
    </Paper>
  );
};

export default VisitorInsights;
