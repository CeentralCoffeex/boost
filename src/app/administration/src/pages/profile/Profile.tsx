import { ReactElement, useEffect, useState } from 'react';
import { Box, Paper, Avatar, Typography, Stack } from '@mui/material';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

const Profile = (): ReactElement => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Générer une couleur aléatoire pour l'avatar
  const generateRandomColor = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
    ];
    return colors[Math.floor(Math.random() * colors.length)] as string;
  };

  // Obtenir les initiales du nom
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  useEffect(() => {
    // Récupérer les informations de l'utilisateur connecté depuis le parent (Next.js)
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        
        if (session && session.user) {
          setUser({
            name: session.user.name || session.user.email || 'Utilisateur',
            email: session.user.email || '',
            role: session.user.role || 'USER',
            avatarColor: generateRandomColor(),
          });
        } else {
          // Données de test si pas de session
          setUser({
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'ADMIN',
            avatarColor: generateRandomColor(),
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        // Données de test en cas d'erreur
        setUser({
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
          avatarColor: generateRandomColor(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography variant="h6" color="text.secondary">
          Chargement...
        </Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography variant="h6" color="error">
          Erreur lors du chargement du profil
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper
        sx={{
          p: { xs: 4, sm: 8 },
          maxWidth: 800,
          mx: 'auto',
        }}
      >
        <Typography variant="h4" color="common.white" mb={6} textAlign="center">
          Mon Profil
        </Typography>

        <Stack spacing={4} alignItems="center">
          {/* Avatar */}
          <Avatar
            sx={{
              width: 120,
              height: 120,
              bgcolor: user.avatarColor,
              fontSize: '2.5rem',
              fontWeight: 600,
            }}
          >
            {getInitials(user.name)}
          </Avatar>

          {/* Nom */}
          <Typography variant="h4" fontWeight={600} color="common.white">
            {user.name}
          </Typography>

          {/* Badge Rôle */}
          <Box
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              bgcolor: user.role === 'ADMIN' ? 'primary.main' : 'info.main',
            }}
          >
            <Typography variant="body1" fontWeight={600} color="common.black">
              {user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
            </Typography>
          </Box>

          {/* Détails */}
          <Stack spacing={3} width="100%" mt={4} maxWidth={500}>
            <Box
              sx={{
                p: 3,
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.disabled" mb={1}>
                Email
              </Typography>
              <Typography variant="body1" fontWeight={500} color="common.white">
                {user.email}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 3,
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.disabled" mb={1}>
                Rôle
              </Typography>
              <Typography variant="body1" fontWeight={500} color="common.white">
                {user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Profile;
