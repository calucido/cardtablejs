let table = document.querySelector('#card-table');
const tableContainer = document.querySelector('#card-table-container');
cards.init({acesHigh: true, table:'#card-table'});

let deck = new cards.Deck(); 
deck.addCards(cards.all); 
deck.render({immediate:true});

let hands = {};
let handsArray = [];
let sendableDeck = [];
let playPile, discardPile;

function resetTable() {
  console.log('clearing table');
  table.remove();
  tableContainer.append(document.createElement('div'));
  tableContainer.children[4].setAttribute('id', 'card-table');
  table = document.querySelector('#card-table');
}

document.querySelector('#deal').onclick = () => {
  console.log('attempting to deal');
  if (!document.querySelector('#howManyCards').value) {
    alert('How many cards per person?');
  } else {
    if (isMaster) {
      deck = new cards.Deck();
      deck.addCards(cards.all);
      cards.shuffle(deck);
      sendableDeck = []; // to prevent duplicate cards on subsequent deals
      for (let i = 0; i<52; i++) {
        sendableDeck.push(deck[i].toString());
      }
      sendEvent({type: 'setup', msg: {clients, screenNames, deck: sendableDeck, howManyCards: document.querySelector('#howManyCards').value}, clientID});
    } else {
      alert('Only the person who started the session can deal.');
    }
  }
};

function setDeckOnclick() {
  deck.click(function(card) {
    if (card === deck.topCard()) {
      sendEvent({type: 'drawOne', clientID});
    }
  });
}

function setMyHandOnclick(action) {
  if (action === 'playOne') {
    hands.myHand.click(card => {
      let cardIndex = hands.myHand.indexOf(card);
      sendEvent({type: 'playOne', msg: {cardIndex}, clientID}); 
      console.log('played ' + card);
    });
  } else {
    // trading logic
  }
}

function setPlayPileOnclick() {
  playPile.click(card => { // it doesn't matter what card is clicked
    sendEvent({type: 'discardPlayPile'});
  });
}

function displayScreenNames(names) {
  document.querySelector('#player-label-B').innerText = names[0];
  document.querySelector('#player-label-L').innerText = names[1];
  document.querySelector('#player-label-T').innerText = names[2];
  document.querySelector('#player-label-R').innerText = names[3];
}

function createNetworkCard(string, clientID) {
  let card;
  if (string.length === 3) {
    card = new cards.Card(string[0], string[1]+string[2], table);
  } else {
    card = new cards.Card(string[0], string[1], table);
  }
  if (clientID) {
    card.container = hands[clientID];
  }
  return card;
}

function sendEvent(data) {
  processGameEvent(data);
  for (let channel in dataChannels) { // if master, then send to everyone; if not, then send only to master, because that's the only channel in dataChannels
    if (channel !== data.clientID) { // no need to send the message to client that sent it
      console.log('data to send', data);
      dataChannels[channel].send(JSON.stringify(data));
    }
  }
}

function processGameEvent(data) {
  console.log(data);
  
  if (data.type === 'setup') {
    
    resetTable();

    console.log(clients)
    
    if (!hands.myHand) {
      screenNames = data.msg.screenNames;
      clients = data.msg.clients;
      if (clients.indexOf(clientID) === 0) {
        clients.shift();
        hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
        hands[clients[0]] = new cards.Hand({faceUp: true, x: 50, y: 200});
        hands[clients[1]] = new cards.Hand({faceUp: true, x: 300, y: 50});
        hands[clients[2]] = new cards.Hand({faceUp: true, x: 550, y: 200});
        handsArray = [hands[clients[2]], hands.myHand, hands[clients[0]], hands[clients[1]]];
        screenNames.push(screenNames.shift());
        displayScreenNames(screenNames);
      } else if (clients.indexOf(clientID) === 1) {
        clients.push(clients.shift());
        clients.shift();
        hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
        hands[clients[0]] = new cards.Hand({faceUp: true, x: 50, y: 200});
        hands[clients[1]] = new cards.Hand({faceUp: true, x: 300, y: 50});
        hands[clients[2]] = new cards.Hand({faceUp: true, x: 550, y: 200});
        handsArray = [hands[clients[1]], hands[clients[2]], hands.myHand, hands[clients[0]]];
        screenNames.push(screenNames.shift());
        screenNames.push(screenNames.shift());
        displayScreenNames(screenNames);
      } else if (clients.indexOf(clientID) === 2) {
        clients.push(clients.shift());
        clients.push(clients.shift());
        clients.shift();
        hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
        hands[clients[0]] = new cards.Hand({faceUp: true, x: 50, y: 200});
        hands[clients[1]] = new cards.Hand({faceUp: true, x: 300, y: 50});
        hands[clients[2]] = new cards.Hand({faceUp: true, x: 550, y: 200});
        handsArray = [hands[clients[0]], hands[clients[1]], hands[clients[2]], hands.myHand];
        screenNames.push(screenNames.shift());
        screenNames.push(screenNames.shift());
        screenNames.push(screenNames.shift());
        displayScreenNames(screenNames);
      } else if (clients.indexOf(clientID) === 3) { // i.e. master
        hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
        hands[clients[0]] = new cards.Hand({faceUp: true, x: 50, y: 200});
        hands[clients[1]] = new cards.Hand({faceUp: true, x: 300, y: 50});
        hands[clients[2]] = new cards.Hand({faceUp: true, x: 550, y: 200});
        handsArray = [hands.myHand, hands[clients[0]], hands[clients[1]], hands[clients[2]]];
        screenNames.push(screenNames.shift());
        screenNames.push(screenNames.shift());
        screenNames.push(screenNames.shift());
        displayScreenNames(screenNames);
      }
    } /*else {
      hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
      hands[clients[0]] = new cards.Hand({faceUp: true, x: 50, y: 200});
      hands[clients[1]] = new cards.Hand({faceUp: true, x: 300, y: 50});
      hands[clients[2]] = new cards.Hand({faceUp: true, x: 550, y: 200});
    }*/

    setMyHandOnclick('playOne');
    
    cards.resetZIndex();
    deck = new cards.Deck({x: 50, y: 350});
    setDeckOnclick();
    for (let i=0; i<data.msg.deck.length; i++) {
      deck.addCard(createNetworkCard(data.msg.deck[i]));
    }
    deck.render();
    deck.deal(data.msg.howManyCards, handsArray, 100);

    playPile = new cards.Deck({faceUp: true, x: 300, y: 200});
    setPlayPileOnclick();

    discardPile = new cards.Deck({faceUp: true, x: 550, y: 350});
  
  } else if (data.type === 'drawOne') {
    
    if (hands[data.clientID]) {
      hands[data.clientID].addCard(deck.topCard());
      hands[data.clientID].render();
    } else {
      hands.myHand.addCard(deck.topCard());
      hands.myHand.render();
    }

  } else if (data.type === 'playOne') {

    if (!hands[data.clientID]) {
      playPile.addCard(hands.myHand[data.msg.cardIndex]);
      hands.myHand.render();
    } else {
      playPile.addCard(hands[data.clientID][data.msg.cardIndex]);
      hands[data.clientID].render();
    }
    playPile.render();

  } else if (data.type === 'discardPlayPile') {

    while (playPile.length > 0) {
      discardPile.addCard(playPile[0]); // playPile changes length when you remove a card from it
    }
    discardPile.render();
    playPile.render();

  }
  // logic for dealing cards etc
}
