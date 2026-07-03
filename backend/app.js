const express = require('express');
const cors = require('cors');
const path = require('path');

const products = require('./routes/product');
const users = require('./routes/user');
const orders = require('./routes/order');
const dashboard = require('./routes/dashboard');
const categories = require('./routes/category');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/v1', products);
app.use('/api/v1', users);
app.use('/api/v1', orders);
app.use('/api/v1', dashboard);
app.use('/api/v1', categories);

module.exports = app;
