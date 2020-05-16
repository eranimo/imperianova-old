import React from 'react';
import { render } from 'react-dom';
import { App } from './App';
import './style.css';
import { ThemeProvider, CssBaseline } from '@material-ui/core';
import { theme } from './theme';
import 'typeface-roboto';

const AppContainer = ({ app }: { app: any }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {app}
  </ThemeProvider>
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