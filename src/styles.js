import { makeStyles } from '@material-ui/core/styles';

export const appStyle = makeStyles((theme) => ({
  root: {
    height: '100vh',
  },
  buttonDiv: {
    display: 'flex',
    justifyContent: 'center',
    '& button': {
      margin: theme.spacing(1)
    },
    '& .MuiSvgIcon-root': {
      marginRight: theme.spacing(0.5)
    }
  },
  roomName: {
    minHeight: '50px',
    justifyContent: 'center',
    margin: theme.spacing(2, 0)
  }
}));
