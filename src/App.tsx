import React, { Suspense } from 'react';
import { Router, Switch, Route } from 'react-router-dom';
import { createBrowserHistory } from "history"

import { CircularProgress } from '@chakra-ui/core';
// import GameView from './views/GameView';
// import MainPage from './views/MainPage';

const MainPage = React.lazy(() => import(/* webpackChunkName: "MainPage" */ './views/MainPage'));
const GameView = React.lazy(() => import(/* webpackChunkName: "GameView" */ './views/GameView'));



export const history = createBrowserHistory();

export const App: React.FC = () => {
  return (
    <Router history={history}>
      <Switch>
        {/* <Route exact path="/" component={MainPage} /> */}
        <Suspense fallback="Loading...">
          <Route exact path="/" component={MainPage} />
          <Route path="/game" component={GameView} />
        </Suspense>
      </Switch>
    </Router>
  );
}
