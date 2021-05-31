const { Model } = require('@phpixel/node-eloquent');

const ChatMessages = require('./ChatMessages');

class User extends Model {
	static tableName() {
		return 'users';
	}

	chatMessages() {
		return this.hasMany(ChatMessages);
	}

	async find(id, select = '*') {
		return await User.select(select).where({ id: id }).get();
	}
}

module.exports = User;