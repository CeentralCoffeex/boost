interface UserMenuItem {
  id: number;
  title: string;
  icon: string;
  color?: string;
  path?: string;
}

const userMenuItems: UserMenuItem[] = [
  {
    id: 1,
    title: 'Retour au site',
    icon: 'material-symbols:home-outline',
    path: '/',
    color: 'text.primary',
  },
];

export default userMenuItems;
