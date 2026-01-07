import { createHashRouter, RouterProvider } from 'react-router-dom';
import { HostPage } from './pages/HostPage';
import { ParticipantPage } from './pages/ParticipantPage';
import { LandingPage } from './pages/LandingPage';

const router = createHashRouter([
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/host',
    element: <HostPage />
  },
  {
    path: '/share',
    element: <ParticipantPage />
  }
]);

export function Router() {
  return <RouterProvider router={router} />;
}
