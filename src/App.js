import { useState, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import PermCameraMicIcon from '@material-ui/icons/PermCameraMic';
import GroupAddIcon from '@material-ui/icons/GroupAdd';
import GroupIcon from '@material-ui/icons/Group';
import CallEndIcon from '@material-ui/icons/CallEnd';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import CardMedia from '@material-ui/core/CardMedia';
import { appStyle } from './styles';

const url = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const socket = io(url);

function App() {
  let peerConnection;
  const configuration = {
    iceServers: [
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  const style = appStyle();

  const [newRoomId, setNewRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [open, setOpen] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();

  const [mediaButtonDisabled, setMediaButtonDisabled] = useState(false);
  const [createButtonDisabled, setCreateButtonDisabled] = useState(true);
  const [joinButtonDisabled, setJoinButtonDisabled] = useState(true);
  const [endButtonDisabled, setEndButtonDisabled] = useState(true);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const createRoom = async () => {
    const room = await axios.post(`${url}/create-room`);
    setNewRoomId(room.data);
    socket.emit('create room', { roomId: room.data });
    // console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);

    // registerPeerConnectionListeners();

    userVideo.current.srcObject.getTracks().forEach(track => {
      peerConnection.addTrack(track, userVideo.current.srcObject);
    });

    // Code for collecting ICE candidates below
    await peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        return;
      }
      // console.log('Got candidate: ', event.candidate);
      const data = { candidate: event.candidate.toJSON(), room: room.data };
      axios.post(`${url}/add-callers`, data);
    });
    // Code for collecting ICE candidates above

    // Code for creating a room below
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    // console.log('Created offer:', offer);

    const roomWithOffer = {
      type: offer.type,
      sdp: offer.sdp,
    };

    axios.post(`${url}/set-room-offer/${room.data}`, { data: roomWithOffer })
    // console.log(`New room created with SDP offer. Room ID: ${room.data}`)
    // Code for creating a room above

    peerConnection.addEventListener('track', event => {
      // console.log('Got remote tracks:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        // console.log('Add a track to the remoteStream:', track);
        partnerVideo.current.srcObject.addTrack(track);
      });
    });

    // Listening for remote session description below
    socket.on('caller snapshot', (snapshot) => {
      const data = snapshot;
      if (
        !peerConnection.currentRemoteDescription &&
        data.updatedFields &&
        data.updatedFields.answer
      ) {
        // console.log('Got remote description: ', data.updatedFields.answer);
        const rtcSessionDescription = new RTCSessionDescription(
          data.updatedFields.answer
        );
        peerConnection.setRemoteDescription(rtcSessionDescription);
      }
    });
    // Listening for remote session description above

    // Listen for remote ICE candidates below
    socket.on('callee snapshot', (snapshot) => {
      // console.log(`Got new remote ICE candidate: ${JSON.stringify(snapshot)}`);
      peerConnection.addIceCandidate(new RTCIceCandidate(snapshot));
    });
    // Listen for remote ICE candidates above

    setCreateButtonDisabled(true);
    setJoinButtonDisabled(true);
  }

  const joinRoom = async () => {
    // console.log('Join room: ', joinRoomId);
    await joinRoomById(joinRoomId);
    setOpen(false);
    setJoinRoomId('');
    setNewRoomId(joinRoomId);
  }

  const joinRoomById = async (roomId) => {
    axios.get(`${url}/join-room/${roomId}`)
      .then(async (res) => {
        if (res.data.offer) {
          // console.log(
          //   'Create PeerConnection with configuration: ', configuration
          // );
          peerConnection = new RTCPeerConnection(configuration);
          // registerPeerConnectionListeners();
          userVideo.current.srcObject.getTracks().forEach(track => {
            peerConnection.addTrack(track, userVideo.current.srcObject);
          });
          // Code for collecting ICE candidates below
          peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
              // console.log('Got final candidate!');
              return;
            }
            // console.log('Got candidate: ', event.candidate);
            const data = { candidate: event.candidate.toJSON(), room: roomId };
            axios.post(`${url}/add-callees`, data);
          });
          // Code for collecting ICE candidates above
          peerConnection.addEventListener('track', event => {
            // console.log('Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
              // console.log('Add a track to the remoteStream:', track);
              partnerVideo.current.srcObject.addTrack(track);
            });
          });
          // Code for creating SDP answer below
          const offer = res.data.offer;
          // console.log('Got offer:', offer);
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
          );
          const answer = await peerConnection.createAnswer();
          // console.log('Created answer:', answer);
          await peerConnection.setLocalDescription(answer);

          const roomWithAnswer = {
            type: answer.type,
            sdp: answer.sdp,
          };

          const data = { room: roomId, data: roomWithAnswer }
          axios.post(`${url}/set-room-answer`, data);
          // Code for creating SDP answer above
          socket.emit('join room', { roomId });
          // Listening for remote ICE candidates below
          socket.on('caller snapshot v2', async (snapshot) => {
            // console.log(
            //   `Got new remote ICE candidate: ${JSON.stringify(snapshot)}`
            // );
            await peerConnection.addIceCandidate(new RTCIceCandidate(snapshot));
          });
          // Listening for remote ICE candidates above
        }
      })

    setCreateButtonDisabled(true);
    setJoinButtonDisabled(true);
  }

  const openUserMedia = async (e) => {
    const stream = await navigator.mediaDevices.getUserMedia(
      { video: true, audio: true }
    );
    userVideo.current.srcObject = stream;
    partnerVideo.current.srcObject = new MediaStream();

    setMediaButtonDisabled(true);
    setCreateButtonDisabled(false);
    setJoinButtonDisabled(false);
    setEndButtonDisabled(false);
    // console.log('Stream:', userVideo.current.srcObject);
  }

  const hangUp = async (e) => {
    const tracks = userVideo.current.srcObject.getTracks();
    tracks.forEach(track => {
      track.stop();
    });

    if (partnerVideo.current.srcObject) {
      partnerVideo.current.srcObject.getTracks().forEach(track => track.stop());
    }

    if (peerConnection) {
      peerConnection.close();
    }

    // Delete room on hangup
    if (newRoomId) {
      axios.post(`${url}/delete-room`, { room: newRoomId })
    }
    window.location.reload(true);
  }

  // const registerPeerConnectionListeners = () => {
  //   peerConnection.addEventListener('icegatheringstatechange', () => {
  //     console.log(
  //       `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  //   });

  //   peerConnection.addEventListener('connectionstatechange', () => {
  //     console.log(`Connection state change: ${peerConnection.connectionState}`);
  //   });

  //   peerConnection.addEventListener('signalingstatechange', () => {
  //     console.log(`Signaling state change: ${peerConnection.signalingState}`);
  //   });

  //   peerConnection.addEventListener('iceconnectionstatechange ', () => {
  //     console.log(
  //       `ICE connection state change: ${peerConnection.iceConnectionState}`);
  //   });
  // }

  return (
    <Grid className={style.root}>
      <AppBar position='sticky' elevation={0}>
        <Toolbar className={style.buttonDiv}>
          <Button
            onClick={openUserMedia}
            variant='contained'
            disabled={mediaButtonDisabled}
          >
            <PermCameraMicIcon />
            <span className={style.buttonText}>Open camera & microphone</span>
          </Button>
          <Button
            onClick={createRoom}
            variant='contained'
            disabled={createButtonDisabled}
          >
            <GroupAddIcon />
            <span className={style.buttonText}>Create room</span>
          </Button>
          <Button
            onClick={handleClickOpen}
            variant='contained'
            disabled={joinButtonDisabled}
          >
            <GroupIcon />
            <span className={style.buttonText}>Join room</span>
          </Button>
          <Button
            onClick={hangUp}
            color='secondary'
            variant='contained'
            disabled={endButtonDisabled}
          >
            <CallEndIcon />
            <span className={style.buttonText}>Hangup</span>
          </Button>
        </Toolbar>
      </AppBar>
      <Grid container className={style.roomName}>
        <Typography variant='h5'>
          {newRoomId && `Room: ${newRoomId}`}
        </Typography>
      </Grid>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        aria-labelledby='form-dialog-title'
      >
        <DialogTitle id='form-dialog-title'>Join Room</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter ID for room to join:
          </DialogContentText>
          <TextField
            autoFocus
            margin='dense'
            onChange={(e) => setJoinRoomId(e.target.value)}
            label='Room ID'
            type='text'
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color='primary'>
            Cancel
          </Button>
          <Button onClick={joinRoom} color='primary'>
            Join
          </Button>
        </DialogActions>
      </Dialog>
      <Grid container spacing={1} className={style.videoBox}>
        <Grid item xs={12} md={6}>
          <CardMedia
            component='video'
            muted autoPlay playsInline
            ref={userVideo}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <CardMedia
            component='video'
            autoPlay playsInline
            ref={partnerVideo}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default App;
