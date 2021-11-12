const { Model } = require('@phpixel/node-eloquent');

const knex = require('./../helpers/knex');
const ChatMessages = require('./ChatMessages');

class User extends Model {
    static tableName() {
        return 'users';
    }

    chatMessages() {
        return this.hasMany(ChatMessages);
    }

    async find(value, select = '*') {
        if (typeof value === 'object') {
            return await knex(User.tableName())
                .select(select)
                .where(value);
        } else {
            return await knex(User.tableName())
                .select(select)
                .where({ id: value });
        }
    }

    async updateToken(id, token) {
        return await knex(User.tableName())
            .where({ id: id })
            .update({ token: token });
    }

    async updateJwtToken(id, jwtToken) {
        return await knex(User.tableName())
            .where({ id: id })
            .update({ 'jwt_token': jwtToken });
    }
}

module.exports = User;