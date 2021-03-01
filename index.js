const express = require("express");
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const PORT = process.env.PORT || 8080;




//SETTING MIDDLEWARE

// app.use(express.static(__dirname + 'GeneratedPDF'));
app.use(express.json(), cors());
app.use(cors()) 
dotenv.config();

//IMPORT ROUTES 
const Route = require("./routes/auth");

//CONNECTION TO DATABASE

mongoose.connect(
  process.env.DB_CONNECT,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => console.log("connected to db  ")
);



//ROUTE MIDDLEWARE

app.use("/api", Route);


app.listen(PORT, () => console.log(`server up and running at  ${PORT}`));


