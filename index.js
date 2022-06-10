const express = require('express')
const app = express()

// cors add korte hobe 
const cors = require('cors');

const admin = require("firebase-admin");
// .env use kortechi tai nahole db pass pabe na
require('dotenv').config()

const { MongoClient, ServerApiVersion } = require('mongodb');
const { json } = require('express');

const port = process.env.PORT || 5000;

// jwt token


// const serviceAccount = require('./doctor-portal-client-844f5-firebase-adminsdk-5xj3b-91c9837684.json')
const serviceAccount = process.env.FIREVASE_SERVICE_SCCOUNT;

console.log(serviceAccount)
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// cors ke middleware hisabe use korar jonno
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wz4lj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

console.log(uri)


// jwt token
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('doctors_portals');
        const appointmentsCollection = database.collection('appointments');

        const userInfo = database.collection('userInfo');

        app.post('/appointments', async (req, res) => {

            const appointment = req.body;
            const result = await appointmentsCollection.insertOne(appointment);


            // console.log(appointment);
            console.log(result);

            // res.json({result}) eita diya insertedId dekha jabe
            res.json(result);

            // res.json({ message: 'hello' });
        })

        app.get('/appointments', verifyToken, async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            console.log(email)

            const query = { email: email, date: date }
            console.log(query)
            const cursor = appointmentsCollection.find(query)
            const appointments = await cursor.toArray();
            res.json(appointments);

        })

        app.post('/userInfo', async (req, res) => {
            const users = req.body;
            const result = await userInfo.insertOne(users);
            console.log(result);
            res.json(result);
        });

        app.put('/userInfo', async (req, res) => {
            try {
                const users = req.body;
                console.log('PUT', users)

                const filter = { email: users.email }
                console.log(filter)
                const options = { upsert: true };
                const updateDoc = { $set: users };
                console.log(updateDoc)

                const result = await userInfo.updateOne(filter, updateDoc, options);

                console.log(result)
                res.json(result);
            }
            catch (error) {
                console.log(error.message)
            }
        })

        app.put('/userInfo/admin', verifyToken, async (req, res) => {
            try {
                const users = req.body;

                console.log('PUT', req.headers.authorization)
                console.log('PUT', req.decodedEmail)

                const requester = req.decodedEmail;
                if (requester) {
                    const requesterAccount = await userInfo.findOne({ email: requester });
                    if (requesterAccount.role === 'admin') {
                        const filter = { email: users.email }
                        const updateDoc = { $set: { role: 'admin' } };
                        const result = await userInfo.updateOne(filter, updateDoc);
                        res.json(result)
                    }
                }

                else {
                    res.status(403).json({ message: 'You do not have access to make admin' })
                }


            }
            catch (error) {
                console.log(error.message)
            }
        })

        // admin chack
        app.get('/userInfo/:email', async (req, res) => {
            const email = req.params.email;
            const quary = { email: email };
            const user = await userInfo.findOne(quary);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
                console.log(isAdmin)
            }
            res.json({ admin: isAdmin })
        })

    }
    finally {
        // await client.close();
    }

}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Doctors Portal')
})

app.listen(port, () => {
    console.log(`listening at : ${port}`)
})