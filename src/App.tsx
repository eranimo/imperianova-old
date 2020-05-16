import React, { Suspense } from 'react';
import { Router, Switch, Route } from 'react-router-dom';
import { createBrowserHistory } from "history"

import { MainPage } from './menu';

// const NewWorldPage = React.lazy(() => import('./components/NewWorldPage'));
// const WorldListPage = React.lazy(() => import('./components/WorldListPage'));
// const LoadWorldPage = React.lazy(() => import('./components/LoadWorldPage'));
// const MapViewer = React.lazy(() => import('./components/MapViewer'));



export const history = createBrowserHistory();

export const App: React.FC = () => (
  <Router history={history}>
    <Switch>
      <Route exact path="/" component={MainPage} />

      {/* <Suspense fallback={<LoadingOverlay />}>
        <Route path="/new" component={NewWorldPage} />
      </Suspense>
      <Suspense fallback={<LoadingOverlay />}>
        <Route path="/worlds" component={WorldListPage} />
      </Suspense>
      <Suspense fallback={<LoadingOverlay />}>
        <Route path="/world/:worldName" component={LoadWorldPage} />
      </Suspense>
      <Suspense fallback={<LoadingOverlay />}>
        <Route path="/game" component={MapViewer} />
      </Suspense> */}
    </Switch>
  </Router>
)