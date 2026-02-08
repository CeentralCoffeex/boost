export interface NavItem {
  id: number;
  path: string;
  title: string;
  icon: string;
  active: boolean;
}

const navItems: NavItem[] = [
  {
    id: 4,
    path: '/product',
    title: 'Produits',
    icon: 'lets-icons:bag-alt-light',
    active: true,
  },
  {
    id: 12,
    path: '/panier',
    title: 'Panier',
    icon: 'mdi:cart-outline',
    active: true,
  },
  {
    id: 7,
    path: '/categories',
    title: 'Catégories',
    icon: 'material-symbols:category',
    active: true,
  },
  {
    id: 8,
    path: '/slider',
    title: 'Bannières',
    icon: 'material-symbols:view-carousel',
    active: true,
  },
  {
    id: 11,
    path: '/telegram',
    title: 'Administrateurs',
    icon: 'mdi:account-supervisor',
    active: true,
  },
  {
    id: 10,
    path: '/profil',
    title: 'Profil',
    icon: 'mdi:account-box-outline',
    active: true,
  },
  {
    id: 9,
    path: '/settings',
    title: 'Paramètres',
    icon: 'mingcute:settings-3-line',
    active: true,
  },
];

export default navItems;
