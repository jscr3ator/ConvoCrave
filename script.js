const socket = io();
let currentUsername = null;
let currentRoom = null;

function setUsername() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) {
    showError('Please enter a username');
    return;
  }
  currentUsername = username;
  document.getElementById('welcomeName').textContent = username;
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.remove('hidden');
}
function showCreateRoom() {
  document.getElementById('createRoomSection').classList.remove('hidden');
  document.getElementById('joinRoomSection').classList.add('hidden');
  document.getElementById('roomCreatedSection').classList.add('hidden');
}

function showJoinRoom() {
  document.getElementById('joinRoomSection').classList.remove('hidden');
  document.getElementById('createRoomSection').classList.add('hidden');
  document.getElementById('roomCreatedSection').classList.add('hidden');
}
function createRoom() {
  socket.emit('create-room', currentUsername);
}

function joinRoom() {
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!roomCode) {
    showError('Please enter a room code');
    return;
  }
  socket.emit('join-room', { roomCode, username: currentUsername });
}

function enterRoom() {
  socket.emit('join-room', { roomCode: currentRoom, username: currentUsername });
}

function showError(msg) {
  const errorBox = document.getElementById('errorMsg');
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
  setTimeout(() => {
    errorBox.classList.add('hidden');
  }, 3000); 
}socket.on('room-created', (data) => {
currentRoom = data.roomCode;
  document.getElementById('roomCodeDisplay').textContent = data.roomCode;
  document.getElementById('createRoomSection').classList.add('hidden');
  document.getElementById('roomCreatedSection').classList.remove('hidden');
});

socket.on('join-success', (data) => {
  currentRoom = data.roomCode;
  document.getElementById('setupScreen').classList.add('hidden');
  document.getElementById('chatContainer').classList.remove('hidden');
  document.getElementById('currentRoomCode').textContent = data.roomCode;
  document.getElementById('userCount').textContent = `${data.userCount} user${data.userCount !== 1 ? 's' : ''}`;
});

socket.on('join-error', (msg) => {
  showError(msg);
});

function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit('send-message', { text });
  messageInput.value = '';
}

socket.on('user-joined', (data) => {
  document.getElementById('userCount').textContent = `${data.userCount} user${data.userCount !== 1 ? 's' : ''}`;
  addSystemMessage(`${data.username} joined`);
});

socket.on('user-left', (data) => {
  document.getElementById('userCount').textContent = `${data.userCount} user${data.userCount !== 1 ? 's' : ''}`;
  addSystemMessage(`${data.username} left`);
});

socket.on('message', (data) => {
  addMessage(data.username, data.text, data.timestamp);
});

let typingTimeout;
document.getElementById('messageInput').addEventListener('input', (e) => {
  socket.emit('typing', true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing', false), 1000);
});

socket.on('user-typing', (data) => {
  const indicator = document.getElementById('typingIndicator');
  indicator.textContent = data.isTyping ? `${data.username} is typing...` : '';
});

function addMessage(username, text, timestamp) {
  const messagesDiv = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  messageDiv.innerHTML = `
    <div>
      <span class="message-author">${username}</span>
      <span class="message-time">${timestamp}</span>
    </div>
    <div class="message-text">${text}</div>
  `;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
const messagesDiv = document.getElementById('messages');
  const messageDiv = document.createElement('div');
messageDiv.className = 'system-message';
  messageDiv.textContent = text;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

//enter key stuff more complicated than it should be whyyy
document.getElementById('usernameInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') setUsername();
});

document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinRoom();
});

document.getElementById('messageInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});
