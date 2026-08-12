const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: 'localhost', database: 'entera', password: 'admin', port: 5433 });
client.connect().then(() => client.query("DELETE FROM applications WHERE app_name = 'Test App'")).then(res => { console.log('Deleted'); client.end(); }).catch(console.error);
