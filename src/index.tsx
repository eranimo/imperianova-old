import React from 'react';
import { render } from 'react-dom';
import { App } from './App';
import './style.css';

const AppContainer = ({ app }: { app: any }) => (
  app
);
const rootElementID = 'root';

render(<AppContainer app={<App />} />, document.getElementById(rootElementID));

if (module.hot) {
  module.hot.accept('./App.tsx', async () => {
    const NewApp: typeof App = require('./App.tsx').App;
    console.log(NewApp);
    render(<AppContainer app={<NewApp />} />, document.getElementById(rootElementID));
  })
}