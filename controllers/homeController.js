//The functionality part of home page is written here and routes are written in route of home.js

const BigPromise = require("../middlewares/bigPromise");

exports.home = BigPromise(async (req, res) => {
  //   const db=await something()
  res.status(200).json({
    success: true,
    greeting: "Hello from API",
  });
});

exports.homeDummy = async (req, res) => {
  // console.log('Hello')
  try {
    res.status(200).json({
      success: true,
      greeting: "Hello from Dummy API",
    });
  } catch (err) {
    console.log(err);
  }
};
