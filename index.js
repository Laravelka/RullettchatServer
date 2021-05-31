require('dotenv').config();

const sha = require('sha256');
const User = require("./Models/User.js");

// const express = require("express");
// const app = express();

// const server = require("http").Server(app);
/*
app.get("/", (req, res) => {
	res.status(200).send("socket.io server");
});
*/
async function getUser() {
	const user = await (new User).find(1);

	console.log(user);
}

getUser();

const httpServer = require("http").createServer();
const options = { /* ... */ };
const io = require("socket.io")(httpServer, options);

io.on("connection", (socket) => {
	console.log(socket);
});

httpServer.listen(3000);