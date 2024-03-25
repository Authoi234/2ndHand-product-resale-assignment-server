const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const productsCollection = client.db('authoisCarsResale').collection('products');
    const usersCollection = client.db('authoisCarsResale').collection('users');
    const ordersCollection = client.db('authoisCarsResale').collection('orders');

    app.get('/categories', async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/category/:id', async (req, res) => {
      const id = req.params.id;
      const idNumber = parseInt(id);
      const filter = {
        categoryId: idNumber
      }
      const result = await productsCollection.find(filter).sort({ timestamp: -1 }).toArray();
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.get('/orders/:email', async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email
      };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/user', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.post('/orders', async (req, res) => {
      const bookingData = req.body;
      const productId = bookingData.productId;
      const result = await ordersCollection.insertOne(bookingData);
      const query = {
        _id: new ObjectId(productId)
      }

      const updatedDoc = {
        $set: {
          status: 'sold'
        }
      }

      const updated = await productsCollection.updateOne(query, updatedDoc, { upsert: true });

      if (updated.acknowledged) {
        res.send(result)
      }
    });

    app.post('/addProduct', async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      const timestamp = result.insertedId.getTimestamp();
      const filterId = result.insertedId.toString();
      const filter = {
        _id: new ObjectId(filterId)
      }
      const updatedResult = await productsCollection.updateOne(filter, { $set: { timestamp: timestamp } }, { upsert: true });
      res.send(updatedResult);

    })

    app.get('/myProducts/:email', async (req, res) => {
      const email = req.params.email;
      const filter = {
        email: email
      };
      const result = await productsCollection.find(filter).sort({ timestamp: -1 }).toArray();
      res.send(result);
    })

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    })

    app.put('/setAdvertised/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id : new ObjectId(id)
      }
      const updatedDoc = {
        $set : {
          isAdvertised: true
        }
      }
      const result = await productsCollection.updateOne(query, updatedDoc, {upsert: true});
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