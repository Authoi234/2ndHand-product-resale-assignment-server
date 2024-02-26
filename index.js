const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// Port
const port = process.env.PORT || 5000;

// App
const app = express();

// Middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.6iupoas.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    const categoriesCollection = client.db('authoisCarsResale').collection('categories');

    app.get('/categories', async (req, res) => {
      const query = { };
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    })

  } finally {

  }
}
run().catch(err => console.log(err));

app.get('/', (req, res) => {
  res.send('Welcome to Authois 2nd hand Product relase server')
});

app.listen(port, () => {
  console.log(`Authois 2nd hand product resale server is running on port: ${port}`)
})