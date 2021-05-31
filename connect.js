const mysql = require('mysql2');
const config = require('./config');

function Connect() {
    this.cfg = config.db;
    this.mysql = mysql.createConnection(this.cfg);
}

Connect.prototype.convertSql = (data, isSet = false) => {
	let sql = '';
	const index = 0;
	for (key in data)
	{
		let value = data[key];

		if (typeof value == 'number')
		{
			if (index == 0)
				sql += '`' + key + '` = ' + value;
			else
				sql += (isSet ? ', ' : ' AND ') + '`' + key + '` = ' + value;
		}
		else
		{
			if (index == 0)
				sql += '`' + key + '` = "' + value + '"';
			else
				sql += (isSet ? ', ' : ' AND ') + '`' + key + '` = "' + value + '"';
		}
		index++;
	}
	return sql;
};

module.exports = Connect;