import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { RouteError } from './pages/RouteError'

// Route-level code splitting: each page loads only when visited.
const HomePage = lazy(() => import('./pages/HomePage'))
const MatchesPage = lazy(() => import('./pages/MatchesPage'))
const MatchupPage = lazy(() => import('./pages/MatchupPage'))
const MatchPage = lazy(() => import('./pages/MatchPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'matches', element: <MatchesPage /> },
      { path: 'matchup/:sport/:a/:b', element: <MatchupPage /> },
      { path: 'match/:sport/:id', element: <MatchPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], {
  // Deployed under a sub-path on GitHub Pages (e.g. /FCB/).
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})
