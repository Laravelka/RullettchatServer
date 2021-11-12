require('dotenv').config();
require('events').EventEmitter.prototype._maxListeners = 50;

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

const { ExpressPeerServer } = require('peer');
const http = require('http').createServer(app);
const cors = require('cors');
const apiRoute = require('./routes/api');

const path = __dirname + '/dist/';
const PORT = process.env.PORT || 8081;
const peerServer = ExpressPeerServer(http, {
    key: 'rullettchatt',
    debug: true
});

app.use(cors());
app.use(express.json());
app.use('/api', apiRoute);
app.use('/peerjs', peerServer);
app.use(history({
    verbose: true
}));
app.use('/', express.static(path));

const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const Turn = require('node-turn');
const turnServer = new Turn({
    debugLevel: 'ALL',
    authMech: 'long-term',
    credentials: {
        rullettchattApp: "30a*cRk8r888m%))"
    }
});
const UserModel = require("./Models/User");
const subscriber = redis.createClient(6378, 'localhost');

const arrAllIds = new Set(); // все
const arrPeerIds = new Set(); // peerjs
const arrCommunicatingIds = new Set(); // уже общаются

function send(socket, userId, data, event = 'message') {
    return socket.broadcast.to(userId).emit(event, data);
}

function sendAll(data, event = 'message') {
    io.emit(event, data);
}

subscriber.subscribe("onLogin");

let socketInstance = null;
io.on('connection', async(socket) => {
    socketInstance = socket;

    const { id, data } = socket;
    const { token } = socket.handshake.query;
    const checkUserToken = await (new UserModel).find({ token: token });

    if (checkUserToken[0] !== undefined) {
        const user = checkUserToken[0];

        delete user.password;
        socket.data = user;

        console.log('[on] connection:', id, socket.data.name);

        if (!arrAllIds.has(user.id)) {
            arrAllIds.add(user.id, socket.data);
        }

        /*io.emit('updateOnline', {
            all: Array.from(arrAllIds),
            communicating: Array.from(arrCommunicatingIds)
        });*/
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
                    arrAllIds.add(user.id, socket.data);
                }

                if (socket.data.id == user.id) {
                    delete socket.data.password;

                    socket.emit("login", user);
                }

                /*io.emit('updateOnline', {
                    all: Array.from(arrAllIds),
                    communicating: Array.from(arrCommunicatingIds)
                });*/
            }
        });
        console.log(`socket.io err auth: ${id}`, [token]);
    }

    socket.on('disconnect', (type) => {
        if (arrAllIds.has(socket.data.id)) {
            arrAllIds.delete(socket.data.id);

            /*io.emit('updateOnline', {
                all: Array.from(arrAllIds),
                communicating: Array.from(arrCommunicatingIds)
            });*/
        }
        console.log('[on] disconnect:', id, socket.data.name);
    });
});

peerServer.on('connection', (client) => {
    const id = client.getId();
    const token = client.getToken();
    const peerSocket = client.getSocket();

    if (!arrPeerIds.has(socketInstance.data.id)) {
        arrPeerIds.add(id, socketInstance.data);

        io.emit('updateOnline', {
            all: Array.from(arrAllIds),
            peers: Array.from(arrPeerIds)
        });
        console.log("[peerServer][on] connection:", id, socketInstance.data.name);
    }
});

peerServer.on('disconnect', (client) => {
    const id = client.getId();
    const token = client.getToken();
    const peerSocket = client.getSocket();

    if (arrPeerIds.has(id)) {
        arrPeerIds.delete(id);

        io.emit('updateOnline', {
            all: Array.from(arrAllIds),
            peers: Array.from(arrPeerIds)
        });
        console.log("[peerServer][on] disconnect:", id, socketInstance.data.name);
    }
});

/*
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
			socket.emit('errorMessage', {
				type: 'two_window',
				text: 'Нельзя открывать вторую вкладку!'
			});
			socket.disconnect(true);
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
					socket.emit('errorMessage', {
						type: 'two_window',
						text: 'Нельзя открывать вторую вкладку!'
					});
					arrAllIds.add(user.id, socket);
				}

				if (socket.data.id == user.id) {
					socket.emit("login", user);
				}
				// send(socket, user.id, user, 'login');

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
*/

turnServer.start();

http.listen(PORT, () => {
    console.log(`Listening to ${PORT}`);
});