import { ReactElement, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Chip,
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import SimpleBar from 'simplebar-react';
import { useNavigate } from 'react-router-dom';
import { fetchWithCSRF } from '../../utils/csrf';

interface Service {
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  popular?: boolean;
  available?: boolean;
}

const Services = (): ReactElement => {
  const navigate = useNavigate();
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setServices(result.data);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce service ?')) return;

    try {
      const response = await fetchWithCSRF(`/api/services/${slug}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Service supprimé avec succès');
        fetchServices();
      } else {
        setError(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      setError('Erreur lors de la suppression du service');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" color="common.white">
          Gestion des Services
        </Typography>
        <Button
          variant="contained"
          startIcon={<IconifyIcon icon="material-symbols:add" />}
          onClick={() => navigate('/services/new')}
          sx={{
            bgcolor: 'primary.main',
            color: 'common.black',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          Ajouter un service
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 4, sm: 8 } }}>
        <TableContainer component={SimpleBar}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.disabled' }}>Titre</TableCell>
                <TableCell sx={{ color: 'text.disabled' }}>Catégorie</TableCell>
                <TableCell sx={{ color: 'text.disabled' }}>Prix</TableCell>
                <TableCell sx={{ color: 'text.disabled' }}>Status</TableCell>
                <TableCell sx={{ color: 'text.disabled' }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.disabled">Chargement...</Typography>
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.disabled">Aucun service</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.slug}>
                    <TableCell>
                      <Typography color="common.white" fontWeight={500}>
                        {service.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="text.primary">{service.category}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="success.main" fontWeight={600}>
                        {service.price} €
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {service.popular && (
                          <Chip
                            label="Populaire"
                            size="small"
                            sx={{ bgcolor: 'warning.main', color: 'common.black' }}
                          />
                        )}
                        {service.available && (
                          <Chip
                            label="Disponible"
                            size="small"
                            sx={{ bgcolor: 'success.main', color: 'common.black' }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => navigate(`/services/edit/${service.slug}`)}
                        sx={{ color: 'primary.main' }}
                      >
                        <IconifyIcon icon="material-symbols:edit" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(service.slug)}
                        sx={{ color: 'error.main' }}
                      >
                        <IconifyIcon icon="material-symbols:delete" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Services;
