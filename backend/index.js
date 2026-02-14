require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./database")
const router = require("./router/index");
const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 5000;
const app = express()

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use("/api", router);

const start = async () => {
    try {
        app.listen(PORT, () => console.log(`Server started on port - ${PORT}`))
    }
    catch (e) {
        console.log(e);
    }
}

start()