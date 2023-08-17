require('dotenv').config()
const express = require('express');
var bodyParser = require('body-parser')
const PORT = 8000;
const app = express();
app.use(express.json());


const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE_URL, { useNewUrlparser: true});
const db = mongoose.connection;
db.on('error', (error) => console.log(error)); // log DB errors
db.once('open', () => console.log('DB connected'));

const resturantRouter = require('./routes/restaurants.js');
app.use('/restaurant', resturantRouter);

app.get("/healthcheck", (req, res) => {
    res.send('Healthcheck Complete.');
});

app.listen(PORT, () => console.log(`Server is now running on https://localhost:${PORT}`));