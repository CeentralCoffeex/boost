import { ReactElement } from 'react';
import { List, Toolbar, Box, Typography } from '@mui/material';
import SimpleBar from 'simplebar-react';
import NavItem from './NavItem';
import { drawerCloseWidth, drawerOpenWidth } from '..';
import IconifyIcon from '../../../components/base/IconifyIcon';

interface SidebarNavItem {
  id: number;
  path: string;
  title: string;
  icon: string;
  active: boolean;
}

const SIDEBAR_MENU_ITEMS: SidebarNavItem[] = [
  { id: 4, path: '/product', title: 'Produits', icon: 'lets-icons:bag-alt-light', active: true },
  { id: 13, path: '/tendances', title: 'Tendances', icon: 'mdi:trending-up', active: true },
  { id: 12, path: '/panier', title: 'Panier', icon: 'mdi:cart-outline', active: true },
  { id: 7, path: '/categories', title: 'Catégories', icon: 'material-symbols:category', active: true },
  { id: 8, path: '/slider', title: 'Bannières', icon: 'material-symbols:view-carousel', active: true },
  { id: 11, path: '/telegram', title: 'Administrateurs', icon: 'mdi:account-supervisor', active: true },
  { id: 10, path: '/profil', title: 'Profil', icon: 'mdi:account-box-outline', active: true },
  { id: 9, path: '/settings', title: 'Paramètres', icon: 'mingcute:settings-3-line', active: true },
];

const Sidebar = ({ open }: { open: boolean }): ReactElement => {
  return (
    <>
      <Toolbar
        sx={{
          position: 'fixed',
          height: 98,
          zIndex: 1,
          bgcolor: 'background.default',
          p: 0,
          justifyContent: 'center',
          width: open ? drawerOpenWidth - 1 : drawerCloseWidth - 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
        component="a"
        href="/"
        target="_top"
        sx={{
          display: 'flex',
          textDecoration: 'none',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
            },
            px: 2,
            width: '100%',
            justifyContent: open ? 'flex-start' : 'center',
          }}
        >
          <IconifyIcon icon="mdi:arrow-left" width={24} height={24} />
          {open && (
            <Typography variant="subtitle1" fontWeight="bold">
              Retour au site
            </Typography>
          )}
        </Box>
      </Toolbar>
      <SimpleBar style={{ maxHeight: '100vh' }}>
        <List
          component="nav"
          sx={{
            mt: 24.5,
            py: 2.5,
          }}
        >
          {SIDEBAR_MENU_ITEMS.map((navItem) => (
            <NavItem key={navItem.id} navItem={navItem} open={open} />
          ))}
        </List>
      </SimpleBar>
    </>
  );
};

export default Sidebar;
