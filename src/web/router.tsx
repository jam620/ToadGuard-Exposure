import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import Layout from './components/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LeaksPage = lazy(() => import('./pages/LeaksPage'));
const LeakDetailPage = lazy(() => import('./pages/LeakDetailPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const WebhooksPage = lazy(() => import('./pages/WebhooksPage'));

const fallback = <div style={{ color: '#64748b', padding: 24 }}>Loading...</div>;

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={fallback}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      {
        path: '/dashboard',
        element: (
          <Suspense fallback={fallback}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: '/leaks',
        element: (
          <Suspense fallback={fallback}>
            <LeaksPage />
          </Suspense>
        ),
      },
      {
        path: '/leaks/:id',
        element: (
          <Suspense fallback={fallback}>
            <LeakDetailPage />
          </Suspense>
        ),
      },
      {
        path: '/alerts',
        element: (
          <Suspense fallback={fallback}>
            <AlertsPage />
          </Suspense>
        ),
      },
      {
        path: '/config',
        element: (
          <Suspense fallback={fallback}>
            <ConfigPage />
          </Suspense>
        ),
      },
      {
        path: '/users',
        element: (
          <Suspense fallback={fallback}>
            <UsersPage />
          </Suspense>
        ),
      },
      {
        path: '/webhooks',
        element: (
          <Suspense fallback={fallback}>
            <WebhooksPage />
          </Suspense>
        ),
      },
    ],
  },
]);
