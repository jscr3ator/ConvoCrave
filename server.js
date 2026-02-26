const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

app.use(express.static(__dirname));

const users = {};
const rooms = {};

function generateRoomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // cool library name xD
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', (username) => {
    if (!username || !username.trim()) return;

    const roomCode = generateRoomCode();
    
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        members: [],
        code: roomCode,
        created: new Date()
      };
    }

    socket.emit('room-created', { roomCode });
  });

  socket.on('join-room', (data) => {
    const { roomCode, username } = data;
    
    if (!roomCode || !username || !username.trim()) {
      socket.emit('join-error', 'Invalid room code or username');
      return;
    }

    if (!rooms[roomCode]) {
      socket.emit('join-error', 'Room not found');
      return;
    }

// username checker thingy
    const usernameTaken = rooms[roomCode].members.some(memberId => {
      return users[memberId]?.username.toLowerCase() === username.trim().toLowerCase();
    });

    if (usernameTaken) {
      socket.emit('join-error', 'Username already taken in this room');
      return;
    }

    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      const oldRoom = socket.currentRoom;
      if (rooms[oldRoom]) {
        rooms[oldRoom].members = rooms[oldRoom].members.filter(id => id !== socket.id);
        if (rooms[oldRoom].members.length === 0) {
          delete rooms[oldRoom];
        } else {
          io.to(oldRoom).emit('user-left', {
            username: users[socket.id]?.username,
            userCount: rooms[oldRoom].members.length
          });
        }
      }
    }

    socket.join(roomCode);
    socket.currentRoom = roomCode;
    users[socket.id] = { username: username.trim(), roomCode };
    rooms[roomCode].members.push(socket.id);

    socket.emit('join-success', { roomCode, userCount: rooms[roomCode].members.length });
    
    io.to(roomCode).emit('user-joined', {
      username: username.trim(),
      userCount: rooms[roomCode].members.length
    });

    console.log(`${username} joined room ${roomCode}`);
  });

  socket.on('typing', (isTyping) => {
    const room = socket.currentRoom;
    const user = users[socket.id];
    if (room && user) socket.to(room).emit('user-typing', { username: user.username, isTyping });
  });

  socket.on('send-message', (data) => {
    const room = socket.currentRoom;
    const user = users[socket.id];

    if (!room || !user || !data.text) return;

    io.to(room).emit('message', {
      username: user.username,
      text: data.text,
      timestamp: new Date().toLocaleTimeString()
    });

    console.log(`[${room}] ${user.username}: ${data.text}`);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    const room = socket.currentRoom;

    if (room && rooms[room]) {
      rooms[room].members = rooms[room].members.filter(id => id !== socket.id);
      if (rooms[room].members.length === 0) {
        delete rooms[room];
        console.log(`Room ${room} deleted (empty)`);
      } else {
        io.to(room).emit('user-left', {
          username: user?.username,
          userCount: rooms[room].members.length
        });
      }
    }

    delete users[socket.id];
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000 !!! 🎉');
});
