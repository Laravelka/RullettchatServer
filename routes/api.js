const redis = require("redis");
const express = require('express'),
    router = express.Router();

const moment = require('moment');
const jsonWebToken = require('jsonwebtoken');
const { generateHash } = require('random-hash');
const passwordHash = require('password-hash');

moment.locale('ru');

const publisher = redis.createClient(6378, 'localhost');
const UserModel = require("./../Models/User");
const User = require("./../Models/User");

router.get('/user', async(req, res, next) => {
    const { query } = req;
    const checkExists = await (new UserModel).find(query.id ? query.id : 0);

    if (!checkExists[0]) {
        res.status(400).json({
            user: {},
            message: 'Пользователь с таким ID не существует.'
        });
    } else {
        res.status(200).json({
            user: checkExists[0],
        });
    }
});

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

            await (new UserModel).updateJwtToken(
                user.id, jsonWebToken.sign({
                    id: user.id,
                    token: user.token
                }, 'Qazxsw102')
            );

            publisher.publish("onLogin", JSON.stringify(user));

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
                await (new UserModel).updateJwtToken(
                    checkExists[0].id, jsonWebToken.sign({
                        id: checkExists[0].id,
                        token: checkExists[0].token
                    }, 'Qazxsw102')
                );

                const isUpdated = await (new UserModel).updateToken(checkExists[0].id, token);

                if (isUpdated) {
                    const user = await (new UserModel).find(checkExists[0].id);

                    publisher.publish("onLogin", JSON.stringify(user[0]));

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