const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

const verifyJWT = (req, res, next) => {

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('unauthorized access');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
};


async function run() {
  try {
    const categoriesCollection = client.db('authoisCarsResale').collection('categories');
    const productsCollection = client.db('authoisCarsResale').collection('products');
    const usersCollection = client.db('authoisCarsResale').collection('users');
    const ordersCollection = client.db('authoisCarsResale').collection('orders');
    const paymentsCollection = client.db('authoisCarsResale').collection('payments');

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
      const data = req.body;
      const productId = data.productId;
      const result = await ordersCollection.insertOne(data);
      const query = {
        _id: new ObjectId(productId)
      }

      const updatedDoc = {
        $set: {
          status: 'sold',
          isAdvertised: false
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
      const updatedResult = await productsCollection.updateOne(filter, { $set: { timestamp: timestamp, status: 'available' } }, { upsert: true });
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
        _id: new ObjectId(id)
      }
      const updatedDoc = {
        $set: {
          isAdvertised: true
        }
      }
      const result = await productsCollection.updateOne(query, updatedDoc, { upsert: true });
      res.send(result);
    });

    app.get('/advertisedItems', async (req, res) => {
      const query = {
        isAdvertised: true,
        status: "available"
      };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/allBuyers', async (req, res) => {
      const allBuyers = await usersCollection.find({ userRole: 'Buyer' })?.sort({ email: 1 }).toArray();
      res.send(allBuyers);
    });

    app.get('/allSellers', async (req, res) => {
      const allBuyers = await usersCollection.find({ userRole: 'Seller' })?.sort({ email: 1 }).toArray();
      res.send(allBuyers);
    });

    app.get('/myBuyers/:email', async (req, res) => {
      const email = req.params.email
      const myBuyers = await ordersCollection.find({ sellersEmail: email }).toArray();

      const seenEmails = new Set();
      const uniqueBuyers = [];

      for (const buyer of myBuyers) {
        if (!seenEmails.has(buyer.email)) {
          seenEmails.add(buyer.email);
          uniqueBuyers.push(buyer);
        }
      }

      res.send(uniqueBuyers);
    });

    app.delete('/user/:id', async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.put('/verifyUser/:id', async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { isUserVerified: true } }, { upsert: true });
      res.send(result);
    });

    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result)
    })

    app.put('/reportProduct/:id', async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.updateOne({ _id: new ObjectId(id) }, {
        $set: {
          isReported: true
        }
      }, { upsert: true });
      res.send(result);
    });

    app.get('/reportedProducts', async (req, res) => {
      const query = { isReported: true };
      const result = await productsCollection.find(query).toArray();
      res.send(result)
    })
    app.delete('/reportedProducts/:id', async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result)
    });

    app.post('/create-payment-intent', async (req, res) => {
      const data = req.body;
      const price = data.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        "payment_method_types": [
          "card"
        ],
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.orderId;
      const filter = {
        _id: new ObjectId(id)
      };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      };
      const updatedResult = await ordersCollection.updateOne(filter, updatedDoc, { upsert: true })
      res.send(result);
    })


    app.get('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await ordersCollection.findOne(query);
      res.send(result)
    });

    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' })
    });

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