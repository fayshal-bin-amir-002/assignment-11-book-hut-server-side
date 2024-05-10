const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: [
        'http://localhost:5174'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const user = process.env.DB_USER;
const pass = process.env.DB_PASS;
const secret_token = process.env.SECRET_ACCESS_TOKEN;

const uri = `mongodb+srv://${user}:${pass}@cluster0.0hiczfr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    jwt.verify(token, secret_token, (error, decoded) => {
        if (error) {
            return res.status(401).send({ message: 'Unauthorized' });
        }
        req.user = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const database = client.db("bookHutDB");
        const booksCollection = database.collection("books");
        const borrowedBooksCollection = database.collection("borrowedBooks");

        //token request
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, secret_token, { expiresIn: "1h" });
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production' ? true : false,
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
                })
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === 'production' ? true : false,
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
                })
                .send({ success: true });
        })

        app.get("/books", async (req, res) => {
            const bookCategory = req?.query?.category;
            const query = { category: { $regex: bookCategory, $options: 'i' } };
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        app.get("/book-details/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await booksCollection.findOne(query);
            res.send(result);
        })

        app.post("/add-book", async (req, res) => {
            const newBook = req.body;
            const result = await booksCollection.insertOne(newBook);
            res.send(result);
        })

        app.post("/borrow-books", async (req, res) => {
            const borrowedBook = req.body;
            const query = {
                'borrower.borrowingBookId': borrowedBook.borrower.borrowingBookId,
                'borrower.borrowerEmail': borrowedBook.borrower.borrowerEmail,
            }
            const exists = await borrowedBooksCollection.findOne(query);
            if (exists) {
                return res.status(400).send('Already added in borrowed book list.')
            }
            const result = await borrowedBooksCollection.insertOne(borrowedBook);
            res.send(result);
        })

        app.patch("/update-quantity/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await booksCollection.updateOne(query, { $inc: { quantity: -1 } });
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Book Hut is running.')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})