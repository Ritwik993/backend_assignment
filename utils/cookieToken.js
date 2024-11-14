const cookieToken = (user, res) => {
  const token = user.getJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_TIME * 24 * 60 * 60 * 1000
    ),
    // new Date This is necessary because the expires property of a cookie requires a Date object to specify when the cookie should expire.
    // new keyword is used to create a new instance of a constructor function. When you write new Date(), you're actually calling the Date constructor function to create a new Date object representing the current date and time.
    httpOnly: true,
  };
  user.password = undefined;
  //name of the cookie and the second field is value of the cookie
  res.status(200).cookie("token", token, options).json({
    success: true,
    token,
    user,
  });
};

module.exports=cookieToken;
