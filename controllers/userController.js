const User = require("../models/user");
const BigPromise = require("../middlewares/bigPromise");
const customError = require("../utils/customError");
const cloudinary = require("cloudinary");
const cookieToken = require("../utils/cookieToken");
const emailHelper = require("../utils/emailHelper");
const crypto = require("crypto");

exports.signup = BigPromise(async (req, res, next) => {
  if (!req.files) {
    return next(new customError("photo is required for signup", 400));
  }

  const { name, email, password } = req.body;

  if (!email || !name || !password) {
    return next(new customError("Name, email and password are required", 400));
  }

  let file = req.files.photo; //We need to inform the frontend team to name the input field for fileUpload as photo
  const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
    folder: "tshirts",
    width: 150,
    crop: "scale",
  });

  //Hamlog pre hook se password before save encrypt kar de rahe hain (check in user.js)
  const user = await User.create({
    name,
    email,
    password,
    photo: {
      id: result.public_id,
      secure_url: result.secure_url,
    },
  });
  // user.password=undefined;

  cookieToken(user, res);
});

exports.login = BigPromise(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new customError("please provide an email and password", 400));
  }

  //get user from DB
  const user = await User.findOne({ email }).select("+password");
  //select("+password") as we have made for password field select:false
  //select() method is used to specify which fields should be included or excluded from the query result. When you write select("+password"), you are specifying that the password field should be included in the query result, even though it might be excluded by default.
  //await User.findOne({email}).select("+password") is querying the database to find a user document with the specified email address ({email}), and it is explicitly requesting that the password field be included in the result.

  if (!user) {
    return next(new customError("Email is incorrect", 400));
  }

  //match the password
  const isPasswordCorrect = await user.isValidatedPassword(password);
  // console.log(isPasswordCorrect);
  // console.log(password);

  if (!isPasswordCorrect) {
    // console.log(password);
    return next(new customError(" password does not match", 400));
  }

  cookieToken(user, res);
});

exports.logout = BigPromise(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logout success",
  });
});

exports.forgotPassword = BigPromise(async (req, res, next) => {
  //collect email
  const { email } = req.body;
  //find user in database
  const user = await User.findOne({ email });

  if (!user) {
    return next(new customError("Email not found as registerd", 400));
  }

  //get token from user models methods
  const forgotToken = user.getForgotPasswordToken();

  //save user fields in DB
  await user.save({ validateBeforeSave: false });
  //we donot want it to get validated before saving to database

  //create a URL
  //const myURL=
  //req.protocol is going to verify u have http or https
  //req.get("host") ===> It will give the hostname (e.g localhost:4000 or youtube)
  //We are trying to craft this url /password/reset/:token

  const myUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/password/reset/${forgotToken}`;

  //craft a message
  const message = `Copy paste this link in your URL and hit enter \n\n ${myUrl}`;

  //attempt to send email
  try {
    await emailHelper({
      email: user.email,
      subject: "ECOMMERCE STORE - Password reset email",
      message,
    });

    //json response if email is success
    res.status(200).json({
      success: true,
      message: "Email send successfully",
    });
  } catch (error) {
    //reset user fields if things goes wrong
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    //send error message
    return next(new customError(error.message, 500));
  }
});

exports.passwordReset = BigPromise(async (req, res, next) => {
  //get token from params
  const token = req.params.token;

  //hash the token as db also stores the hashed version
  const encToken = crypto.createHash("sha256").update(token).digest("hex");
  console.log(encToken);

  //find user based on hashed token and time in future

  const user = await User.findOne({
    forgotPasswordToken: encToken,
    forgotPasswordExpiry: { $gt: Date.now() }, //Time is greater than current time
  });

  if (!user) {
    return next(new customError("Token is invalid or expired", 400));
  }

  //check if password and confirm password matches

  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new customError("password and confirm password doesnot match", 400)
    );
  }

  //update password field in DB
  user.password = req.body.password;

  //reset token fields
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  //save the user
  await user.save();

  //send a JSON response Or send token
  cookieToken(user, res);
});

// /userdashboard route is used to get all the details of the user
exports.getLoggedInUserDetails = BigPromise(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    user,
  });
});

// This route is to  change the password for the loggedin user
exports.changePassword = BigPromise(async (req, res, next) => {
  const userId = req.user.id;
  //get user from database
  const user = await User.findById(userId).select("+password");

  //check if old password is correct
  const isCorrectOldPassword = await user.isValidatedPassword(
    req.body.oldPassword
  );

  if (!isCorrectOldPassword) {
    return next(new customError("old password is incorrect", 400));
  }

  //allow to set new password
  user.password = req.body.password;

  await user.save();
  cookieToken(user, res);
});

exports.updateUserDetails = BigPromise(async (req, res, next) => {
  //add a check for email and name in body
  if(!req.body.name && !req.body.email){
    return next(new customError("Please enter the email and password",404));
  }

  //collect data from body
  const newData = {
    name: req.body.name,
    email: req.body.email,
  };

  //if photo comes to us
  if (req.files) {
    const user = await User.findById(req.user.id);
    //now u have extracted the user now ur job is to extract photo id from it
    const imageId = user.photo.id;
    //delete photo on cloudinary
    const resp = await cloudinary.v2.uploader.destroy(imageId);

    //upload the now photo
    const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
      folder: "tshirts",
      width: 150,
      crop: "scale",
    });

    //add photo in newData object
    newData.photo = {
      id: result.public_id,
      secure_url: result.secure_url,
    };
  }

  //update the user

  const user = await User.findByIdAndUpdate(req.user.id, newData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

exports.adminAllUser=BigPromise(async(req,res,next)=>{
    //select all users
    const users=await User.find();

    //send all users
    res.status(200).json({
        success:true,
        users
    })
})


exports.admingetOneUser = BigPromise(async (req, res, next) => {
    // get id from url and get user from database
    const user = await User.findById(req.params.id);
  
    if (!user) {
      next(new CustomError("No user found", 400));
    }
  
    // send user
    res.status(200).json({
      success: true,
      user,
    });
  });

exports.adminUpdateOneUserDetails=BigPromise(async(req,res,next)=>{
    //add a check for email and name in body
  if(!req.body.name && !req.body.email && !req.body.role){
    return next(new customError("Please enter the email or password or role",404));
  }

  //get data from request body
  const newData={
    name:req.body.name,
    email:req.body.email,
    role:req.body.role,
  };

  //update the user details
  const user=await User.findByIdAndUpdate(req.params.id,newData,{
    new:true,
    runValidators:true,
    useFindAndModify: false,
  })

  res.status(200).json({
    success:true,
  })
})


exports.adminDeleteOneUser=BigPromise(async(req,res,next)=>{
    //get user from url
    const user=await User.findById(req.params.id);

    if(!user){
        return next(new customError("No such user found",401));
    }

    //get imageId from user in database
    const imageId=user.photo.id;

    //delete image from cloudinary
    await cloudinary.v2.uploader.destroy(imageId);

    //remove user from database
    await user.remove();
})

//manager would only be able to extract the user with the role of user
//He will not be able to see other manager or other admins
exports.managerAllUser=async(req,res,next)=>{
    //select user with the role user
    const users=await User.find({role:"user"});

    res.status(200).json({
        success:true,
        users
    })
}