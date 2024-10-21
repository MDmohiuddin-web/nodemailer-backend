const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const emailRoutes = require("./Routing/emailRoutes.js");
app.use(cors());
app.use(express.json());
/**
 * ----------------------
 * naming convention
 * ----------------------
 * app.get('/user')
 * app.get('/user/:id')
 * app.post('/user')
 * app.put('/user/:id')
 * app.patch('/user/:id')
 * app.delete('/user/:id')
 */

const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.cg8xo0z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("smtpmailsystem").collection("users");
    const studentCollection = client.db("smtpmailsystem").collection("student");
    const hostingCollection = client.db("smtpmailsystem").collection("hosting");
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // users collections api
    app.post("/users", async (req, res) => {
      const user = req.body;
      //insert email if user does not exist
      //you can do this many ways (1:email unique, 2: upsert, 3: simple checking,)
      const filter = { email: user.email };
      const existingUser = await usersCollection.findOne(filter);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      console.log(req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.findOne(query);
      if (result) {
        res.send(result);
      } else {
        res.status(404).send({ message: "users not found" });
      }
    });

    // users collections for delete users
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    // users collections for students
    // students collections api
    app.post("/student", async (req, res) => {
      const user = req.body;
      //insert email if user does not exist
      //you can do this many ways (1:email unique, 2: upsert, 3: simple checking,)
      const filter = { email: user.email };
      const existingUser = await studentCollection.findOne(filter);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await studentCollection.insertOne(user);
      res.send(result);
    });


    
    app.get("/student/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studentCollection.findOne(query);
      if (result) {
        res.send(result);
      } else {
        res.status(404).send({ message: "users not found" });
      }
    });



    app.get("/student", async (req, res) => {
      console.log(req.headers);
      const result = await studentCollection.find().toArray();
      res.send(result);
    });

    // student collections for delete student
    app.delete("/student/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studentCollection.deleteOne(query);
      res.send(result);
    });
    // students collections api
    app.post("/hosting", async (req, res) => {
      const user = req.body;
      //insert email if user does not exist
      //you can do this many ways (1:email unique, 2: upsert, 3: simple checking,)
      const filter = { email: user.email };
      const existingUser = await hostingCollection.findOne(filter);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await hostingCollection.insertOne(user);
      res.send(result);
    });

    app.get("/hosting", async (req, res) => {
      console.log(req.headers);
      const result = await hostingCollection.find().toArray();
      res.send(result);
    });

    // hosting collections for update hosting
    app.patch("/hosting/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }; 
      const user = req.body;
      const updateDoc = {
        $set: {
          SMTPServer: user.SMTPServer,
          port: user.port,
          security: user.security,
          email: user.email,
          password: user.password,
        },
      };
      const result = await hostingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/hosting/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await hostingCollection.findOne(query);
      if (result) {
        res.send(result);
      } else {
        res.status(404).send({ message: "Hosting not found" });
      }
    });

    // hosting collections for delete hosting
    app.delete("/hosting/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await hostingCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.use("/email", emailRoutes, (req, res) => {
  res.send("email routes working");
});
app.get("/", (req, res) => {
  res.send("Sending Emails with Nodemailer API test!");
});
app.listen(port, () => {
  console.log(`Sending Emails with Nodemailer on port ${port}`);
});
