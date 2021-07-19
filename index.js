require('dotenv').config();

const redis = require("redis");
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
const subscriber = redis.createClient(6378, 'localhost');
const peerServer = require('webrtc-peer-server')(io);

subscriber.subscribe("onLogin");

function send(socket, userId, data, event = 'message') {
	return socket.broadcast.to(userId).emit(event, data);
}

function sendAll(data, event = 'message') {
	io.emit(event, data);
}

const arrAllIds = new Set(); // все
const arrCommunicatingIds = new Set(); // уже общаются

peerServer.on('connect', async(socket) => {
	const { id } = socket;
	const { token } = socket.handshake.query;
	const checkUserToken = await (new UserModel).find({ token: token });

	console.log('connect::', id, checkUserToken);

	if (checkUserToken[0] !== undefined) {
		const user = checkUserToken[0];

		delete user.password;
		socket.data = user;

		if (!arrAllIds.has(user.id)) {
			/*socket.emit('errorMessage', {
				type: 'two_window',
				text: 'Нельзя открывать вторую вкладку!'
			});
			socket.disconnect(true);*/
			arrAllIds.add(user.id, socket);
		}
		
		io.emit('updateOnline', {
			all: Array.from(arrAllIds).length,
			communicating: Array.from(arrCommunicatingIds).length
		});
	} else {
		socket.emit('errorMessage', {
			type: 'auth_fail',
			text: 'Ошибка авторизации!'
		});

		subscriber.on("message", function(channel, message) {
			console.log(channel, JSON.parse(message));

			if (channel == 'onLogin') {
				const user = JSON.parse(message);

				delete user.password;
				socket.data = user;

				if (!arrAllIds.has(user.id)) {
					/*socket.emit('errorMessage', {
						type: 'two_window',
						text: 'Нельзя открывать вторую вкладку!'
					});*/
					arrAllIds.add(user.id, socket);
				}
				socket.emit('login', user);

				io.emit('updateOnline', {
					all: Array.from(arrAllIds).length,
					communicating: Array.from(arrCommunicatingIds).length
				});
			}
		});
		console.log(`socket.io err auth: ${id}`, [token]);
	}

	socket.on('disconnect', (type) => {
		console.log('уходит:', socket.data)

		arrAllIds.delete(socket.data.id);

		io.emit('updateOnline', {
			all: Array.from(arrAllIds).length,
			communicating: Array.from(arrCommunicatingIds).length
		});
		console.log('disconnect:', socket.data.name, socket.id);
	});
});

peerServer.on('discover', (request) => {
	const { socket } = request;

	arrCommunicatingIds.add(socket.id, socket.data);

	request.discover(Array.from(arrCommunicatingIds));
});

peerServer.on('request', (request) => {
	const { socket } = request;

	request.forward();

	console.log(request.initiator, 'звонит к ', request.target);
});

peerServer.on('message', (socket, request) => {
	const { target, message } = request;

	if (socket.data.token) {
		delete socket.data.token;
	}

	if (socket.data.password) {
		delete socket.data.password;
	}

	send(socket, target, {
		from: {
			user: socket.data,
			socketId: socket.id
		},
		message: message
	}, 'webrtc-peer[message]');
});

peerServer.on('disconnect', (socket) => {
	arrCommunicatingIds.delete(socket.id);

	io.emit('updateOnline', {
		all: Array.from(arrAllIds).length,
		communicating: Array.from(arrCommunicatingIds).length
	});
	console.log('disconnect::', socket.data.id, socket.id);
});

http.listen(PORT, () => {
	console.log(`Listening to ${PORT}`);
});