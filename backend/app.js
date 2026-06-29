const express = require('express');
const cors = require('cors');
const path = require('path');

const products = require('./routes/product');
const customers = require('./routes/customer');
const users = require('./routes/user');
const transactions = require('./routes/transaction');
const dashboard = require('./routes/dashboard');
const categories = require('./routes/category');
const units = require('./routes/unit');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/v1', products);
app.use('/api/v1', customers);
app.use('/api/v1', users);
app.use('/api/v1', transactions);
app.use('/api/v1', dashboard);
app.use('/api/v1', categories);
app.use('/api/v1', units);

module.exports = app;
