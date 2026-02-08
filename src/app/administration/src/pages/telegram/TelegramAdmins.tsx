import { ReactElement, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';

interface TelegramAdmin {
  id: string;
  telegramId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  addedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  telegramPhoto?: string | null;
}

const TelegramAdmins = (): ReactElement => {
  const [admins, setAdmins] = useState<TelegramAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/telegram/admins', { credentials: 'include' });
      const data = await response.json();
      if (Array.isArray(data)) {
        setAdmins(data);
      } else {
        setAdmins([]);
        if (data?.error && !response.ok) {
          setError(data.error);
        }
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError('Erreur lors du chargement des administrateurs');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (admin: TelegramAdmin) => {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetchWithCSRF(`${base}/api/telegram/admins/${encodeURIComponent(admin.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !admin.isActive }),
        credentials: 'include',
      });
      if (response.ok) {
        setSuccess(`Administrateur ${!admin.isActive ? 'activé' : 'désactivé'} avec succès`);
        fetchAdmins();
      } else {
        const result = await response.json();
        setError(result.error || 'Erreur lors de la modification');
      }
    } catch (err) {
      console.error('Toggle error:', err);
      setError('Erreur lors de la modification');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h5" color="common.white">
          Administrateurs
        </Typography>
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

      <Stack spacing={1.5}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : admins.length === 0 ? (
          <Typography color="text.disabled" align="center">
            Aucun administrateur
          </Typography>
        ) : (
          admins.map((admin) => (
            <Card
              key={admin.id}
              elevation={0}
              sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'center',
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                width: '100%',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <Avatar
                src={
                  admin.telegramPhoto
                    ? admin.telegramPhoto
                    : admin.telegramId
                      ? `/api/telegram/user-photo?telegramId=${admin.telegramId}`
                      : undefined
                }
                sx={{
                  width: 56,
                  height: 56,
                  mr: 2,
                  bgcolor: 'action.hover',
                }}
              >
                <IconifyIcon icon="mdi:account" width={28} color="text.secondary" />
              </Avatar>

              <Box
                sx={{
                  flexGrow: 1,
                  minWidth: 0,
                  mx: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ minWidth: 0, mr: 2, flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  {admin.username && (
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{ fontSize: '0.9rem', color: 'text.primary' }}
                    >
                      @{admin.username}
                    </Typography>
                  )}
                  {admin.telegramId && (
                    <Typography
                      variant="caption"
                      fontFamily="monospace"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.8rem',
                        bgcolor: 'action.hover',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      {admin.telegramId}
                    </Typography>
                  )}
                  {!admin.username && !admin.telegramId && (
                    <Typography variant="subtitle2" color="text.disabled">
                      —
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.75rem',
                      bgcolor: admin.isActive ? 'success.lighter' : 'action.disabledBackground',
                      color: admin.isActive ? 'success.dark' : 'text.disabled',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 'bold',
                      cursor: (admin.id.startsWith('config-') || admin.id === 'current-user') ? 'default' : 'pointer',
                      '&:hover': (admin.id.startsWith('config-') || admin.id === 'current-user') ? {} : { opacity: 0.9 },
                    }}
                    onClick={() => !admin.id.startsWith('config-') && admin.id !== 'current-user' && handleToggleActive(admin)}
                  >
                    {admin.isActive ? 'ACTIF' : 'INACTIF'}
                  </Typography>
                </Box>
              </Box>

            </Card>
          ))
        )}
      </Stack>
    </Box>
  );
};

export default TelegramAdmins;
