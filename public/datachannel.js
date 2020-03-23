'use strict';

let signalRoom;
let screenName;
let clientID;
let clients = [];
let rtcPeerConnections = {};
let dataChannels = {};
let screenNames = [];
let message;
let isMaster = false;
let dataChannelsCount = 0;

io = io.connect();
document.querySelector('#connect').onclick = e => {
  signalRoom = document.querySelector('#room').value
  screenName = document.querySelector('#screenName').value
  clientID = io.id;
  io.emit('ready', {screenName, signalRoom});
};

document.querySelector('#startGame').onclick = e => {
  io.emit('start', {screenName, signalRoom});
  isMaster = true;
};

io.on('clientList', data => {
  data = JSON.parse(data);
  clients = data.clients;
  screenNames = data.screenNames;
  screenNames.push(screenNames.splice(screenNames.indexOf(screenName), 1)[0]);
  clients.splice(clients.indexOf(io.id), 1);
  console.log('clients to contact', clients);
  for (let client of clients) {
    startSignaling(client);
    generateOffer(client);
  }
});

io.on('signalingMessage', function(data) {
  if (!rtcPeerConnections[data.from]) { startSignaling(data.from); }
  if (data.type !== 'clientConnected') {
    message = JSON.parse(data.message);
    if (message.sdp) {
      if (data.type === 'offer') {
        console.log('got an offer');
        rtcPeerConnections[data.from].setRemoteDescription(message.sdp).then(() => {
          console.log('set remote description because of an offer');
          return rtcPeerConnections[data.from].createAnswer();
        }).then(answer => {
         return rtcPeerConnections[data.from].setLocalDescription(answer);
        }).then(() => {
          console.log('sent answer');
          io.emit('signal', {type: 'answer', message: JSON.stringify({ 'sdp': rtcPeerConnections[data.from].localDescription }), target: data.from});
        });
      } else if (data.type === 'answer') {
        console.log('setting remote description from an answer offer');
        rtcPeerConnections[data.from].setRemoteDescription(message.sdp);
      }
    } else {
      rtcPeerConnections[data.from].addIceCandidate(new RTCIceCandidate(message.candidate));
      console.log('added ICE candidate');
    }
  }
});

function startSignaling(client) {
  console.log('starting signaling');
  rtcPeerConnections[client] = new RTCPeerConnection({'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]});

  rtcPeerConnections[client].ondatachannel = event => {
    dataChannels[client] = event.channel
    dataChannels[client].onmessage = receiveDataChannelMessage;
    console.log('received data channel; disconnecting from socket', event);

    io.emit('goodbye', {target: signalRoom}); 
  };

  // send ICE candidates to peer
  rtcPeerConnections[client].onicecandidate = e => {
    if (e.candidate) {
      io.emit('signal', {type: 'iceCandidate', message: JSON.stringify({ 'candidate': e.candidate }), target: client});
      console.log('sent ICE candidate');
    }
  };
}

function generateOffer(client) {

  rtcPeerConnections[client].onnegotiationneeded = () => {
    rtcPeerConnections[client].createOffer().then((offer) => {
      return rtcPeerConnections[client].setLocalDescription(offer);
    }).then(() => {
      io.emit('signal', {type: 'offer', message: JSON.stringify({ 'sdp': rtcPeerConnections[client].localDescription }), target: client});
      console.log('sent offer')
    }).catch(e => {throw new Error(e)});
  };

  dataChannels[client] = rtcPeerConnections[client].createDataChannel('cardEvents', {ordered: true, maxRetransmits: 5});

  dataChannels[client].onopen = () => {
    if (dataChannels[client].readyState === 'open') {
      console.log('data channel open and ready for use');
      dataChannels[client].onmessage = receiveDataChannelMessage;
      dataChannelsCount++;
      if (dataChannelsCount === 3) {
        // activate deal button
        io.emit('goodbye', {target: signalRoom});
      }
    }
  };

}

io.on('disconnect', () => {
  //for (let client in dataChannels) { clients.push(client); }
  clients.push(clientID); // added own clientID because hands are named by the former websocket clientID
});

function receiveDataChannelMessage(event) {
  console.log('from data channel:', event);
  
  let data = JSON.parse(event.data)

  if (data.type === 'meta') {
  } else {
    if (isMaster) {
      sendEvent(data); // master needs to forward; there is processing code in sendEvent, so master doesn't process here; send event expects a JSON object
    } else {
      processGameEvent(data);
    }
  }
}
