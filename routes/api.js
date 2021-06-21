const express = require('express'),
	router = express.Router();

const moment = require('moment');
const { generateHash } = require('random-hash');
const passwordHash = require('password-hash');

moment.locale('ru'); 

const UserModel = require("./../Models/User");

router.post('/register', async(req, res, next) => {
	const { body } = req;

	if (body.name && body.password) {
		const checkExists = await UserModel
			.where({ name: body.name })
			.get();
		
		if (checkExists[0]) {
			res.status(400).json({
				message: 'Пользователь с таким именем уже существует.'
			});
		} else {
			const token = generateHash({ length: 100 });
			const password = passwordHash.generate(body.password);

			const user = await UserModel.create({
				name: body.name,
				token: token,
				password: password,
				created_at: moment().format("YYYY-MM-DD hh:mm:ss"),
				updated_at: moment().format("YYYY-MM-DD hh:mm:ss")
			});

			res.status(200).json({
				user: user,
				message: 'Вы успешно вошли!'
			});
		}
	} else {
		res.status(400).json({
			message: 'Вы пропустили поле.'
		});
	}
});

router.post('/auth', async(req, res, next) => {
	const { body } = req;

	if (body.name && body.password) {
		const token = generateHash({ length: 100 });
		const hashedPassword = passwordHash.generate(body.password);

		const checkExists = await UserModel
			.where({ name: body.name })
			.get();

		if (checkExists[0]) {
			if (passwordHash.verify(body.password, checkExists[0].password)) {
				const isUpdated = await (new UserModel).updateToken(checkExists[0].id, token);

				if (isUpdated) {
					const user = await (new UserModel).find(checkExists[0].id);

					res.status(200).json({
						user: user[0],
						message: 'Вы успешно вошли!'
					});
				} else {
					res.status(500).json({
						message: 'Ошибка обновления.'
					});
				}
			} else {
				res.status(400).json({
					message: 'Имя или пароль неверны.'
				});
			}
		} else {
			res.status(400).json({
				message: 'Пользователь с таким именем не найден.'
			});
		}
	} else {
		res.status(400).json({
			message: 'Вы пропустили поле.'
		});
	}
});

module.exports = router;