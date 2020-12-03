import { makeStyles } from '@material-ui/core/styles';

export const appStyle = makeStyles((theme) => ({
  root: {
    overflowX: 'hidden',
  },
  buttonDiv: {
    height: '65px',
    display: 'flex',
    justifyContent: 'center',
    '& button': {
      margin: theme.spacing(1)
    },
    '& .MuiSvgIcon-root': {
      marginRight: theme.spacing(0.5)
    }
  },
  buttonText: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'inline-block'
    },
  },
  videoBox: {
    height: 'calc(100vh - 95px)',
  },
  roomName: {
    minHeight: '30px',
    justifyContent: 'center',
    margin: theme.spacing(1.5, 0),
    '& h5': {
      fontSize: '18px',
      [theme.breakpoints.up('sm')]: {
        fontSize: '20px'
      },
    }
  }
}));
