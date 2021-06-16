require('dotenv').config();

const app = require('express')();
const http = require('http').createServer(app);
const cors = require('cors');
const sha256 = require('sha256');
const UserModel = require("./Models/User.js");

async function getUser() {
	const user = await (new UserModel).find(1);

	console.log(user);
}

const PORT = process.env.PORT || 5000;

app.use(cors());
app.options('*', cors());

const io = require('socket.io')(http, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});

const signalServer = require('simple-signal-server')(io);
const allIDs = new Set();

signalServer.on('discover', (request) => {
	const clientID = request.socket.id; // clients are uniquely identified by socket.id

	allIDs.add(clientID); // keep track of all connected peers

	request.discover(Array.from(allIDs)); // respond with id and list of other peers

	console.log('discovered:', clientID);
});

signalServer.on('disconnect', (socket) => {
	const clientID = socket.id;

	allIDs.delete(clientID);

	console.log('disconnected:', clientID);
});

signalServer.on('request', (request) => {
	request.forward(); // forward all requests to connect

	console.log('request: ', request.initiator, 'to', request.target);
});

app.get('/', (req, res) => {
	res.send('Сервер успешно запущен');

	console.log('home');
});

http.listen(PORT, () => {
	console.log(`Listening to ${PORT}`);
});
