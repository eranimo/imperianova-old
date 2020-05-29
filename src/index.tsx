import React from 'react';
import { render } from 'react-dom';
import { App } from './App';
import './style.css';
import { ThemeProvider, CSSReset, DarkMode, ColorModeProvider, theme } from "@chakra-ui/core"


const AppContainer = ({ app }: { app: any }) => (
  <ThemeProvider>
    <ColorModeProvider value="dark">
      <CSSReset />
      {app}
    </ColorModeProvider>
  </ThemeProvider>
);
const rootElementID = 'root';

render(<AppContainer app={<App />} />, document.getElementById(rootElementID));

// if (module.hot) {
//   module.hot.accept('./App.tsx', async () => {
//     const NewApp: typeof App = require('./App.tsx').App;
//     render(<AppContainer app={<NewApp />} />, document.getElementById(rootElementID));
//   })
// }