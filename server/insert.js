const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: 'localhost', database: 'entera', password: 'admin', port: 5433 });
client.connect().then(() => client.query("INSERT INTO applications (app_name, organization_id) VALUES ('Test App', 1)")).then(res => { console.log('Inserted'); client.end(); }).catch(console.error);
