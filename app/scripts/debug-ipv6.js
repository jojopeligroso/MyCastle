/* eslint-disable @typescript-eslint/no-require-imports */
const net = require('net');

const HOST_IPV6 = '2a05:d018:135e:1631:7259:a824:bd5f:8cd';
const PORT = 5432;

console.log(`--- Testing TCP Connection to [${HOST_IPV6}]:${PORT} ---`);

try {
  const socket = net.createConnection(
    {
      host: HOST_IPV6,
      port: PORT,
      family: 6,
    },
    () => {
      console.log('✅ Connected successfully!');
      socket.end();
    }
  );

  socket.on('error', err => {
    console.error('❌ Socket Error:', err);
  });

  socket.setTimeout(5000, () => {
    console.log('❌ Timeout (5s)');
    socket.destroy();
  });
} catch (err) {
  console.error('❌ Synchronous Error:', err);
}
