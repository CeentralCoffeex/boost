import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import IconifyIcon from '../../../components/base/IconifyIcon';
import { NavItem as NavItemProps } from '../../../data/nav-items';

const NavItem = ({ navItem, open }: { navItem: NavItemProps; open: boolean }) => {
  const { pathname } = useLocation();
  
  const isActive = pathname === navItem.path ||
                   (navItem.path === '/' && pathname === '/') ||
                   (navItem.path !== '/' && pathname.startsWith(navItem.path) && navItem.path !== '#!');
  
  return (
    <ListItem
      disablePadding
      className={isActive ? 'nav-item-active' : ''}
      sx={(theme) => ({
        display: 'block',
        px: 5,
        borderRight: !open
          ? isActive
            ? `3px solid ${theme.palette.primary.main}`
            : `3px solid transparent`
          : '',
      })}
    >
      <ListItemButton
        component={RouterLink}
        to={navItem.path}
        className={isActive ? 'nav-item-active' : ''}
        sx={{
          opacity: navItem.active ? 1 : 0.5,
          bgcolor: isActive ? (open ? 'common.white' : '') : '#000',
          '&:hover': {
            bgcolor: isActive ? 'common.white' : '#1a1a1a',
          },
          '& .MuiTouchRipple-root': {
            color: isActive ? 'common.black' : 'text.disabled',
          },
        }}
      >
        <ListItemIcon
          sx={{
            width: 20,
            height: 20,
            mr: open ? 'auto' : 0,
            color: isActive ? 'common.black' : 'text.primary',
          }}
        >
          <IconifyIcon icon={navItem.icon} width={1} height={1} />
        </ListItemIcon>
        <ListItemText
          primary={navItem.title}
          sx={{
            display: open ? 'inline-block' : 'none',
            opacity: open ? 1 : 0,
            color: isActive ? 'common.black' : 'text.primary',
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default NavItem;
