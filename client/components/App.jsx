import React, { Component } from 'react';
import Character from './Character.jsx';
import Background from './Background.jsx';

function getInitialState() {
  return {
    bkgr1PosX: '0px',
    bkgr2PosX: '916px',
    jump: {},
    lastJumpTime: 0,
    users: {},
    id: null,
    name: null
  };
}

class App extends Component {
  constructor(props) {
    super(props);
    this.handleKey = this.handleKey.bind(this);
    this.setFalse = this.setFalse.bind(this);
    this.update = this.update.bind(this);
    this.state = getInitialState();
  }

  // Jump handling
  handleKey(value, e) {
    let lastJumpTime = this.state.lastJumpTime
    if (this.state.id === null) {
      // Send start game message to the server
      this.sendStartMessage();
    } else if (e.keyCode === 32 && (Date.now() - lastJumpTime) >= 1000) {
      e.preventDefault();
      this.sendJumpMessage();
    }

  }

  setFalse(id) {
    const jumpObj = Object.assign({}, this.state.jump);
    jumpObj[id] = false;
    this.setState({jump: jumpObj});
  }

  update() {
    this.setState((prevState) => {
      const prevX1 = Number(prevState.bkgr1PosX.slice(0, -2));
      const prevX2 = Number(prevState.bkgr2PosX.slice(0, -2));
      let newX1;
      let newX2;
      if (prevX1 === -915) {
        newX1 = '916px';
        newX2 = prevX2 - 1 + 'px';
      } else if (prevX2 === -915) {
        newX1 = prevX1 - 1 + 'px';
        newX2 = '916px';
      } else {
        newX1 = prevX1 - 1 + 'px';
        newX2 = prevX2 - 1 + 'px';
      }
      return {
        bkgr1PosX: newX1,
        bkgr2PosX: newX2,
      }
    });
  }
  
  componentDidMount() {
    window.addEventListener('keypress', this.handleKey.bind(this, true));
    setInterval(this.update, 10);
    
    // Set up Websocket
    const HOST = location.origin.replace(/^http/, 'ws')
    this.ws = new WebSocket(HOST);

    const thisApp = this;
    
    // WS Router
    this.ws.onmessage = function (event) {
      const message = JSON.parse(event.data);

      // Successful connection to server
      // Get back name and id of own character
      if (message.event === 'successfullyConnected') {
        // Display my name and id
        console.log(`I am ${message.user.name} (id: ${message.user.id})`);
        thisApp.setState({
          id: message.user.id,
          name: message.user.name,
          colorRotation: message.user.colorRotation
        });
      }

      // Get back users object and id of user that connected or disconnected
      if (message.event === 'newUserConnected' || message.event === 'userDisconnected') {
        const jumpObj = Object.assign({}, thisApp.state.jump);
        Object.keys(message.users).forEach(user => {
          console.log(`${message.users[user].name} (id: ${message.users[user].id})`);
          if (jumpObj[message.users[user].id] === undefined) {
            jumpObj[message.users[user].id] = false;
          }
        });
        thisApp.setState({
          users: message.users,
          jump: jumpObj
        });
      }

      // Get back id of user that jumped
      if (message.event === 'characterJumped') {
        // message.id will contain which character jumped
        console.log(`${message.id} jumped!`);
        const jumpObj = Object.assign({}, thisApp.state.jump);
        jumpObj[message.id] = true;
        thisApp.setState({
          jump: jumpObj
        });
        setTimeout(() => thisApp.setFalse(message.id), 500);
      }

      // Get back id of user that died
      if (message.event === 'characterDied') {
        // message.id will contain which character died
        console.log(`${message.id} died!`);
      }
    };
  }

  // Invoke this function whenever the character jumps
  // It sends a message to the server that the character has jumped
  sendJumpMessage() {
    this.ws.send(JSON.stringify({
      event: 'jump'
    }));
  }

  // Invoke this function whenever the character joins the game
  // It sends a message to the server that the character has started the game
  sendStartMessage() {
    this.ws.send(JSON.stringify({
      event: 'start'
    }));
  }
  
  // Invoke this function whenever the character dies
  // It sends a message to the server that the character has jumped
  sendDeathMessage() {
    this.ws.send(JSON.stringify({
      event: 'death'
    }));
  }
  
  render() {
      
    const { bkgr1PosX, bkgr2PosX } = this.state;

    // Render every character that is connected
    const connectedUsers = [];
    Object.keys(this.state.users).forEach(id => {
      connectedUsers.push(<Character jump={this.state.jump[id]} key={id} name={this.state.users[id].name} colorRotation={this.state.users[id].colorRotation} />);
    });
    
    return (
      <div id='background'>
        <Background bkgr1PosX={bkgr1PosX} bkgr2PosX={bkgr2PosX} />
        { connectedUsers }
      </div>
    )
  }
}

export default App
