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
  document.querySelector('#connect').disabled = true;
};

document.querySelector('#startGame').onclick = e => {
  io.emit('start', {screenName, signalRoom});
  isMaster = true;
};

io.on('clientList', data => {
  data = JSON.parse(data);
  clients = data.clients;
  screenNames = data.screenNames;
  if (isMaster) {
    document.querySelector('#deal').disabled = false;
  }
});

io.on('gameEvent', data => {
  if (data.type === 'meta') {
  } else {
    processGameEvent(data);
  }
});
