const express = require('express');
const config = require('./config');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/files', require('./routes/files'));
app.use('/api/tools', require('./routes/tools'));
app.use('/', require('./routes/share'));

app.listen(config.port, () => console.log(`ledgerly listening on ${config.port}`));
