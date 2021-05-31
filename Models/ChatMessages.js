const { Model } = require('@phpixel/node-eloquent');

const User = require('./User');

class ChatMessages extends Model {
	static tableName() {
		return 'chat_messages';
	}
	
	user() {
		return this.hasOne(User);
	}
};

module.exports = ChatMessages;