//importing modules for server side code
const express = require("express");
const bodyparser = require("body-parser");
const cors = require("cors");
const path = require("path");
const router = require("./routes/route");
const app = express();

//1 add middleware setup
app.use(cors());
app.use(bodyparser.json());

//2 static files setup __dirname is the project root. Our static file location are stored in public folder under root directory
// All the display on the UI will be refered from this location's index.html keeping it as a display wrapper for all the various display rendering
app.use(express.static(path.join(__dirname, "public")));

// api/router setup
// const uuidAPIKey = require("uuid-apikey");
// console.log(uuidAPIKey.create().apiKey);
const key = "5ET4NH9-4M64SNC-J3X5MGD-7MHPYZB";
app.use("/api/" + key, router);

// this method runs at the entry point of starting the applications
// Listening to the express server.
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Data creator application Server started at port: " + port);
});