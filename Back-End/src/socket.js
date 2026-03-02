const { Server } = require("socket.io");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Client join a diary room to receive real-time updates
    socket.on("join-diary", (diaryId) => {
      socket.join(`diary:${diaryId}`);
      console.log(`📖 Socket ${socket.id} joined diary:${diaryId}`);
    });

    // Client leave a diary room
    socket.on("leave-diary", (diaryId) => {
      socket.leave(`diary:${diaryId}`);
      console.log(`📖 Socket ${socket.id} left diary:${diaryId}`);
    });

    // Client join the explore/feed room
    socket.on("join-feed", () => {
      socket.join("feed");
      console.log(`🌐 Socket ${socket.id} joined feed`);
    });

    socket.on("leave-feed", () => {
      socket.leave("feed");
      console.log(`🌐 Socket ${socket.id} left feed`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initSocket first.");
  }
  return io;
};

module.exports = { initSocket, getIO };
