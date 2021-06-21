require('dotenv').config();

const winston = require('winston');
const logger = winston.createLogger({
	transports: [
		new winston.transports.Console(),
	]
});

const history = require('connect-history-api-fallback');
const express = require('express'),
	router = express.Router(),
	app = express();

const http = require('http').createServer(app);
const cors = require('cors');
const sha256 = require('sha256');
const apiRoute = require('./routes/api');

const path = __dirname + '/dist/';
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoute);
app.use(history({
	verbose: true
}));
app.use('/', express.static(path));

const UserModel = require("./Models/User");

const io = require('socket.io')(http, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});
const signalServer = require('simple-signal-server')(io);

function message (userId, data, event = 'message') {
	return io.sockets.to(userId).emit(event, data);
}

function getRealSocketId(id) {
	if (io.sockets.sockets.has(id)) {
		return io.sockets.sockets.get(id).client.id;
	} else {
		return false;
	}
}

const allIDs = new Set();
signalServer.on('discover', (request) => {
	const { socket } = request;

	const clientID = socket.id;

	allIDs.add(clientID);

	request.discover(Array.from(allIDs));

	console.log('discovered:', clientID);
});

signalServer.on('disconnect', (socket) => {
	const clientID = socket.id;

	allIDs.delete(clientID);

	console.log('disconnect: ', clientID);
});

signalServer.on('destroy', (socket) => {
	const clientID = socket.id;

	console.log('destroy: ', clientID);
});

signalServer.on('request', (request) => {
	const { socket } = request;

	request.forward();

	message(request.initiator, 'Звоним к ' + request.target);
	message(request.target, 'Звонят от ' + request.initiator);
});

const arrIds = new Set();
io.on("connection", async(socket) => {
	const { id } = socket.client;
	const { token } = socket.handshake.query;
	const checkUserToken = await (new UserModel).find({ token: token });

	socket.on('message', (data) => {
		// const socketId = getRealSocketId(data.id);

		message(data.id, data.text);

		console.log('message:', data);
	});

	if (checkUserToken[0]) {
		arrIds.add({socketId: id, user: checkUserToken[0]});

		delete checkUserToken[0].password;

		console.log(`socket.io connected: ${id}`, checkUserToken[0]);

		allIDs.forEach((item) => {
			const socketId = getRealSocketId(item);

			console.log('item: ', item, socketId);

			message(socketId, allIDs.length, 'update-online-count');
		});
	} else {
		socket.disconnect(0);
	}
});

http.listen(PORT, () => {
	console.log(`Listening to ${PORT}`);
});