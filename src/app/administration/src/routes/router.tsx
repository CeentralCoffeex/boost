import { lazy, Suspense, ReactElement, PropsWithChildren } from 'react';
import { Outlet, RouteObject, createHashRouter } from 'react-router-dom';

import PageLoader from '../components/loading/PageLoader';
import Splash from '../components/loading/Splash';
import { rootPaths } from './paths';
import paths from './paths';

const App = lazy<() => ReactElement>(() => import('../App'));

const MainLayout = lazy<({ children }: PropsWithChildren) => ReactElement>(
  () => import('../layouts/main-layout'),
);

const Product = lazy<() => ReactElement>(() => import('../pages/product/Product'));
const ProductEdit = lazy<() => ReactElement>(() => import('../pages/product/edit/ProductEdit'));
const Settings = lazy<() => ReactElement>(() => import('../pages/settings/Settings'));
const TelegramAdmins = lazy<() => ReactElement>(() => import('../pages/telegram/TelegramAdmins'));
const Categories = lazy<() => ReactElement>(() => import('../pages/categories/Categories'));
const CategoryEdit = lazy<() => ReactElement>(() => import('../pages/categories/CategoryEdit'));
const SubcategoryEdit = lazy<() => ReactElement>(() => import('../pages/categories/subcategory/SubcategoryEdit'));
const Slider = lazy<() => ReactElement>(() => import('../pages/slider/Slider'));
const ProfilBlocks = lazy<() => ReactElement>(() => import('../pages/profil-blocks/ProfilBlocks'));
const Panier = lazy<() => ReactElement>(() => import('../pages/panier/Panier'));
const ErrorPage = lazy<() => ReactElement>(() => import('../pages/error/ErrorPage'));

const routes: RouteObject[] = [
  {
    element: (
      <Suspense fallback={<Splash />}>
        <App />
      </Suspense>
    ),
    children: [
      {
        path: paths.home,
        element: (
          <MainLayout>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </MainLayout>
        ),
        children: [
          {
            index: true,
            element: <Product />,
          },
          {
            path: rootPaths.productRoot,
            element: <Product />,
          },
          {
            path: 'product/new',
            element: <ProductEdit />,
          },
          {
            path: 'product/edit/:id',
            element: <ProductEdit />,
          },
          {
            path: rootPaths.settingsRoot,
            element: <Settings />,
          },
          {
            path: 'telegram',
            element: <TelegramAdmins />,
          },
          {
            path: 'categories',
            element: <Categories />,
          },
          {
            path: 'categories/new',
            element: <CategoryEdit />,
          },
          {
            path: 'categories/edit/:id',
            element: <CategoryEdit />,
          },
          {
            path: 'categories/subcategory/new',
            element: <SubcategoryEdit />,
          },
          {
            path: 'categories/subcategory/edit/:id',
            element: <SubcategoryEdit />,
          },
          {
            path: 'slider',
            element: <Slider />,
          },
          {
            path: 'profil',
            element: <ProfilBlocks />,
          },
          {
            path: 'panier',
            element: <Panier />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <ErrorPage />,
  },
];

export default createHashRouter(routes);
