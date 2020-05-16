import { createMuiTheme } from "@material-ui/core";
import { blue, grey } from "@material-ui/core/colors";

export const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: blue,
    secondary: grey
  },
})