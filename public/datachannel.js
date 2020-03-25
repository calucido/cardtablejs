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

document.querySelector('#start-game').disabled = true; // fix for some browsers not disabling on reload

io = io.connect();
document.querySelector('#connect').onclick = e => {
  if (!document.querySelector('#room').value) {
    alert('Please enter a room.');
  } else if (!document.querySelector('#screenName').value) {
    alert('Please enter a screen name.');
  } else {
    signalRoom = document.querySelector('#room').value
    screenName = document.querySelector('#screenName').value
    clientID = io.id;
    io.emit('ready', {screenName, signalRoom});
    document.querySelector('#connect').disabled = true;
    document.querySelector('#start-game').disabled = false;
  }
};

document.querySelector('#start-game').onclick = e => {
  io.emit('start', {screenName, signalRoom});
  isMaster = true;
};

io.on('clientList', data => {
  data = JSON.parse(data);
  if (data.clients.length === 4) {
    clients = data.clients;
    screenNames = data.screenNames;
    if (isMaster) {
      document.querySelector('#deal').disabled = false;
    }
    document.querySelector('#start-game').disabled = true;
  } else {
    if (isMaster) {
      alert(`You need four players to start a game. There are currently ${data.clients.length} players in the room. If you thought four players had joined, try refreshing and joining a different room.`);
      isMaster = false;
    }
  }
});

io.on('gameEvent', data => {
  if (data.type === 'meta') {
  } else {
    processGameEvent(data);
  }
});

io.on('lostClient', () => {
  alert(`Someone disconnected, so the game can't go on. Refresh the page and join a new game.`);
  function sendEvent() {
    alert(`Someone disconnected, so the game can't go on. Refresh the page and join a new game.`);
  }
  document.querySelector('#connect').disabled = false;
  document.querySelector('#start-game').disabled = true;
});
