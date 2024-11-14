//It will be responsible for handling all the routes that comes to home page
const express = require("express");
const router = express.Router();
const { home, homeDummy } = require("../controllers/homeController");
//Router is the default functionality available in express itself

router.route("/").get(home);
router.route("/dummy").get(homeDummy);

module.exports = router;
