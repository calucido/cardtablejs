let table = document.querySelector('#card-table');
const tableContainer = document.querySelector('#card-table-container');
cards.init({acesHigh: true, table: '#card-table'});

let deck = new cards.Deck(); 
deck.addCards(cards.all); 
deck.render({immediate:true}); // do all this so that it looks pretty upon pageload

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
  document.querySelector('#sort-hand-caps').disabled = true;
  document.querySelector('#sort-hand-by-suit').disabled = true;
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
      for (let i = 0; i<deck.length; i++) {
        sendableDeck.push(deck[i].toString());
      }
      sendEvent({type: 'setup', msg: {clients, screenNames, deck: sendableDeck, howManyCards: document.querySelector('#howManyCards').value, capsDeal: document.querySelector('#caps-switch').checked}, clientID});
    } else {
      alert('Only the person who started the session can deal.');
    }
  }
};

document.querySelector('#sort-hand-caps').onclick = () => {
  sendEvent({type: 'sortHand', msg: {sortType: 'caps'}, clientID});
};

document.querySelector('#sort-hand-by-suit').onclick = () => {
  sendEvent({type: 'sortHand', msg: {sortType: 'bySuit'}, clientID});
};

document.querySelector('#trade-switch').onclick = () => {
  if (document.querySelector('#trade-switch').checked) { // counterintuitive, but I guess onclick fires after it's saved as checked
    sendEvent({type: 'enableTrading'});
  } else {
    sendEvent({type: 'disableTrading'});
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
    });
  } else {
    // trading logic
  }
}

function setDiscardPileOnclick() {
  discardPile.click(() => { // doesn't matter which card is clicked
    while (discardPile.length > 0) {
      deck.addCard(discardPile[0]); // playPile changes length when you remove a card from it
    }
    cards.shuffle(deck);
    sendableDeck = [];
    for (let i=0; i<deck.length; i++) {
      sendableDeck.push(deck[i].toString());
    }
    while (deck.length > 0) {
      deck.obliterateCard(deck[0]);
    }
    sendEvent({type: 'replenishDeck', msg: {deck: sendableDeck}, clientID});
  });
}

function sortHand(handID, sortType) {
  if (sortType === 'caps') {
    hands[handID].sort((a, b) => {
      if (parseFloat(a.rank) === 2 && parseFloat(b.rank) === 2) {
        return 0;
      } else if (parseFloat(b.rank) === 2) {
        return 1;
      } else if (parseFloat(a.rank) === 2) {
        return -1;
      } else {
        return parseFloat(b.rank)-parseFloat(a.rank);
      }
    });
  } else if (sortType === 'byRank') {
    hands[handID].sort((a, b) => {
      return parseFloat(b.rank)-parseFloat(a.rank);
    });
  } else if (sortType === 'bySuit') {
    hands[handID].sort((a, b) => {
      if (a.suit === b.suit) {
        return a.rank-b.rank;
      } else {
        if (a.suit<b.suit) { return -1; }
        else { return 1; } // it's not equal, otherwise would have been caught earlier
      }
    });
  }
  hands[handID].render();
}

function setPlayPileOnclick(action) {
  if (action === 'discard') {
    playPile.click(card => { // it doesn't matter what card is clicked
      sendEvent({type: 'discardPlayPile'});
    });
  } else if (action === 'addToHand') {
    playPile.click(card => {
      sendEvent({type: 'addFromPlayPile', clientID});
    });
  }
}

function displayScreenNames(names) {
  document.querySelector('#player-label-B').innerText = names[0];
  document.querySelector('#player-label-L').innerText = names[1];
  document.querySelector('#player-label-T').innerText = names[2];
  document.querySelector('#player-label-R').innerText = names[3];
}

function createNetworkCard(string, client) {
  let card;
  if (string.length === 4) {
    card = new cards.Card(string[0], string[1]+string[2]+string[3], table);
  } else if (string.length === 3) {
    card = new cards.Card(string[0], string[1]+string[2], table);
  } else {
    card = new cards.Card(string[0], string[1], table);
  }
  //if (clientID) {
  //  card.container = hands[client];
  //} TEST THIS
  return card;
}

function createLogEntry(data) { // {type, msg, screenName}
  let screenName = screenNames[clients.indexOf(data.clientID)]; // this is different for everyone

  let eventElement = document.createElement('div');
  eventElement.classList.add('log-event');
  let eventText = document.createElement('p');
  eventElement.append(eventText);
  if (data.type === 'setup') {
    eventText.innerText = `${screenName} cleared the table and dealt a new hand.`;
  } else if (data.type === 'claimHand') {
    eventText.innerText = `${screenName} claimed the hand with the top card ${data.msg.topCard}.`;
  } else if (data.type === 'playOne') {
    eventText.innerText = `${screenName} played ${data.msg.card}.`;
  } else if (data.type === 'discardPlayPile') {
    eventText.innerText = `${screenName} cleared the play pile to the discard pile.`;
  }
  document.querySelector('#log-container').insertBefore(eventElement, document.querySelector('#log-container').children[0]);
}

function sendEvent(data) {
  data.signalRoom = signalRoom;
  console.log('data to send', data);
  io.emit('gameEvent', data);
}

function processGameEvent(data) {
  console.log('received', data);
  
  if (data.type === 'setup') {
    
    resetTable();

    if (!hands.myHand) {
      screenNames = data.msg.screenNames;
      clients = data.msg.clients;
      if (clients.indexOf(clientID) === 0) {
        hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
        hands[clients[1]] = new cards.Hand({faceUp: false, x: 50, y: 200});
        hands[clients[2]] = new cards.Hand({faceUp: false, x: 300, y: 50});
        hands[clients[3]] = new cards.Hand({faceUp: false, x: 550, y: 200});
        handsArray = [hands.myHand, hands[clients[1]], hands[clients[2]], hands[clients[3]]];
      } else if (clients.indexOf(clientID) === 1) {
        hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
        hands[clients[2]] = new cards.Hand({faceUp: false, x: 50, y: 200});
        hands[clients[3]] = new cards.Hand({faceUp: false, x: 300, y: 50});
        hands[clients[0]] = new cards.Hand({faceUp: false, x: 550, y: 200});
        handsArray = [hands[clients[0]], hands.myHand, hands[clients[2]], hands[clients[3]]];
        screenNames.push(screenNames.shift());
      }  else if (clients.indexOf(clientID) === 2) {
        hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
        hands[clients[3]] = new cards.Hand({faceUp: false, x: 50, y: 200});
        hands[clients[0]] = new cards.Hand({faceUp: false, x: 300, y: 50});
        hands[clients[1]] = new cards.Hand({faceUp: false, x: 550, y: 200});
        screenNames.push(screenNames.shift());
        screenNames.push(screenNames.shift());
        handsArray = [hands[clients[0]], hands[clients[1]], hands.myHand, hands[clients[3]]];
      } else if (clients.indexOf(clientID) === 3) {
        hands = {myHand: new cards.Hand({faceUp: true, x: 300, y: 350})};
        hands[clients[0]] = new cards.Hand({faceUp: false, x: 50, y: 200});
        hands[clients[1]] = new cards.Hand({faceUp: false, x: 300, y: 50});
        hands[clients[2]] = new cards.Hand({faceUp: false, x: 550, y: 200});
        screenNames.push(screenNames.shift());
        screenNames.push(screenNames.shift());
        screenNames.push(screenNames.shift());
        handsArray = [hands[clients[0]], hands[clients[1]], hands[clients[2]], hands.myHand];
      }
      displayScreenNames(screenNames);
    } else {
      for (let hand of handsArray) {
        hand.claimant = '';
        while (hand.length > 0) {
          hand.removeCard(hand[0]);
        }
      }
    }

    setMyHandOnclick('playOne');
    
    cards.resetZIndex();
    deck = new cards.Deck({x: 50, y: 350});
    setDeckOnclick();
    for (let i=0; i<data.msg.deck.length; i++) {
      deck.addCard(createNetworkCard(data.msg.deck[i]));
    }
    deck.render();

    if (data.msg.capsDeal) {
      hands.myHand.faceUp = false;
      hands.myHand.render();
    }
    deck.deal(data.msg.howManyCards, handsArray, 40, () => {
      if (data.msg.capsDeal) {
        for (let hand in hands) {
          hands[hand][hands[hand].length - 1].showCard();
          hands[hand].click(card => {
            sendEvent({type: 'claimHand', msg: {hand: (hand === 'myHand') ? clientID : hand}, clientID});
          });
        }
      }
    });

    document.querySelector('#sort-hand-caps').disabled = false;
    document.querySelector('#sort-hand-by-suit').disabled = false;

    playPile = new cards.Deck({faceUp: true, x: 300, y: 200});
    setPlayPileOnclick('discard');

    discardPile = new cards.Deck({faceUp: true, x: 550, y: 350});
    setDiscardPileOnclick();

    createLogEntry({type: 'setup', clientID: data.clientID});
  
  } else if (data.type === 'claimHand') {

    //flip card, keep track
    if (data.msg.hand === clientID) {
      data.msg.hand = 'myHand'
    }
    hands[data.msg.hand][hands[data.msg.hand].length - 1].hideCard();
    hands[data.msg.hand].claimant = data.clientID;
    hands[data.msg.hand].click(() => {return null;});

    createLogEntry({type: 'claimHand', msg: {topCard: hands[data.msg.hand][hands[data.msg.hand].length - 1].toString()}, clientID: data.clientID});

    let claimedCount = 0; // reset hand claimant upon deal
    for (let hand in hands) {
      if (hands[hand].claimant) {
        claimedCount++;
        if (claimedCount === 4) {
          let tempHands = {};
          for (let client of clients) {
            if (client === clientID) { client = 'myHand'; }
            tempHands[client] = new cards.Hand();
          }
          for (let client of clients) {
            if (client === clientID) { client = 'myHand'; }
            if (hands[client].claimant === clientID) { claimant = 'myHand'; } else { claimant = hands[client].claimant }
            if (client !== claimant) {
              while (hands[client].length > 0) {
                tempHands[claimant].addCard(hands[client][0]);
              }
            }
          }
          for (let client of clients) {
            if (client === clientID) { client = 'myHand'; }
            while (tempHands[client].length > 0) {
              hands[client].addCard(tempHands[client][0]);
            }
            hands[client].render();
          }
          hands.myHand.faceUp = true;
          hands.myHand.render();
          setMyHandOnclick('playOne');
        }
      }
    }

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
      createLogEntry({type: 'playOne', msg: {card: hands.myHand[data.msg.cardIndex]}, clientID: data.clientID});
      playPile.addCard(hands.myHand[data.msg.cardIndex]);
      hands.myHand.render();
    } else {
      createLogEntry({type: 'playOne', msg: {card: hands[data.clientID][data.msg.cardIndex]}, clientID: data.clientID});
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
    createLogEntry({type: 'discardPlayPile', clientID: data.clientID});

  } else if (data.type === 'sortHand') {

    if (hands[data.clientID]) {
      sortHand(data.clientID, data.msg.sortType);
    } else {
      sortHand('myHand', data.msg.sortType);
    }

  } else if (data.type === 'undo') {

    

  } else if (data.type === 'replenishDeck') {

    if (deck.length > 0) {
      alert('The deck has to be empty before you can reshuffle.');
    } else {
      deck = new cards.Deck({x: 50, y: 350});
      setDeckOnclick();
  
      for (let card of data.msg.deck) {
        deck.addCard(createNetworkCard(card));
      }
      while (discardPile.length > 0) {
        discardPile.obliterateCard(discardPile[0]);
      }
      deck.render();
      discardPile.render();
    }

  } else if (data.type === 'disableTrading') {

    document.querySelector('#trade-switch').checked = false;
    playPile.faceUp = true;
    playPile.render();
    setPlayPileOnclick('discard');

  } else if (data.type === 'enableTrading') {

    document.querySelector('#trade-switch').checked = true;
    playPile.faceUp = false;
    playPile.render();
    setPlayPileOnclick('addToHand');

  } else if (data.type === 'addFromPlayPile') {

    if (hands[data.clientID]) {
      hands[data.clientID].addCard(playPile.topCard());
      hands[data.clientID].render();
    } else {
      hands.myHand.addCard(playPile.topCard());
      hands.myHand.render();
    }

  }
  // logic for dealing cards etc
}
