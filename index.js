"use strict";

const express = require('express');
const app = express();

app.use(express.static(__dirname + '/public'));

const server = require('http').createServer(app);
const io = require('socket.io')(server);

console.log(`Card Table server started on port ${process.env.PORT || 8080}`);

server.listen(process.env.PORT || 8080);

let roomIndex = {};

io.on('connect', socket => {
  console.log('a client connected');

  socket.on('ready', data => {
    if (!roomIndex[data.signalRoom]) {
      roomIndex[data.signalRoom] = {ids: [], screenNames: []};
    }
    if (roomIndex[data.signalRoom].ids.indexOf(socket.id) === -1) {
      socket.join(data.signalRoom);
      roomIndex[data.signalRoom].ids.push(socket.id);
      roomIndex[data.signalRoom].screenNames.push(data.screenName);
      console.log(data.screenName + ' joined ' + data.signalRoom);
    }
  });

  socket.on('start', data => {
    io.to(socket.id).emit('clientList', JSON.stringify({clients: roomIndex[data.signalRoom].ids, screenNames: roomIndex[data.signalRoom].screenNames}));
    console.log(`${data.screenName} has started connecting ${data.signalRoom}`);
  });

  socket.on('signal', data => {
    io.to(data.target).emit('signalingMessage', {type: data.type, message: data.message, from: socket.id});
    //console.log(data.screenName, data.target, data.type, data.message);
  });
  
  socket.on('goodbye', data => {
    if(roomIndex[data.target]) {
      roomIndex[data.target].ids.splice(roomIndex[data.target].ids.indexOf(socket.id));
      socket.disconnect(true);
      if (roomIndex[data.target].ids.length === 0) { // only master left; master won't leave on its own
        delete roomIndex[data.target];
        console.log(`room ${data.target} has been vacated`);
        if (Object.keys(roomIndex).length === 0) {
          console.log('closing server to save time');
          process.exit();
        }
      }
    }
  });
});
