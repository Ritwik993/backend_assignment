const mongoose=require('mongoose');
const validator=require('validator');
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const crypto=require("crypto");

const userSchema=new mongoose.Schema({
    //new keyword is used to create a new instance of Mongoose Schema
    name:{
        type:String,
        required:[true,"Please provide a name"],
        maxLength:[40,"Name should be under 40 characters"],
    },
    email:{
        type:String,
        required:[true,"Please provide a email"],
        validate:[validator.isEmail,"Please enter email in correct format"],
        unique:true
    },
    password:{
        type:String,
        required:[true,"Please enter a password"],
        minLength:[6,"password must be atleast 6 characters"],
        select:false, //We donot want password to be send to the user
    },
    role:{
        type:String,
        default:"user"//We are trying to the set the initial value of role
    },
    //For atleast one user we need to manually in database we need to change the role as admin
    photo:{
        id:{
            type:String,
            required:true
        },
        secure_url:{
            type:String,
            required:true 
        }
    },
    forgotPasswordToken:String,
    forgotPasswordExpiry:Date,
    createdAt:{
        type:Date,
        default:Date.now, 
        //We donot want Date.now to store the current date so we are not writing Date.now()
        //We want to store the date as soon as it is created so we write Date.now
    }
})

// We have two lifecycle events pre and post
//encrypt- Password before save - HOOKS
// We cannot use this keyword with arrow function
userSchema.pre("save",async function(next){
    if(!this.isModified("password")){
        return next();
    }
    //hash the password only when it is modified 
    this.password=await bcrypt.hash(this.password,10);
})


//validate the password with passed on user password 
userSchema.methods.isValidatedPassword=async function(userPassword){
    // console.log("this password",this.password);
    return await bcrypt.compare(userPassword,this.password);
}

//create and return jwt token
userSchema.methods.getJwtToken=function(){
    return jwt.sign({id:this._id},process.env.JWT_SECRET,{
        expiresIn:process.env.JWT_EXPIRY,
    })
}

//generate forgot password token (which is basically only string)
//In reality JWT token is something which has object_id,expiry and hell lot of other things
userSchema.methods.getForgotPasswordToken=function(){
    //generate a long and random string
    const forgotToken=crypto.randomBytes(20).toString("hex");

    //getting  a hash - for Backend only
    this.forgotPasswordToken=crypto.createHash("sha256").update(forgotToken).digest("hex");
    console.log(this.forgotPasswordToken);

    //time for token expiry
    this.forgotPasswordExpiry=Date.now()+20*60*1000; //20 minutes from the time of creation of token
console.log(forgotToken);
    return forgotToken;

    //We will send to the user forgotToken without doing hash
}

module.exports=mongoose.model('User',userSchema);

//Cryptographic hash functions :------
//It maps the bit array of arbitary size to a bit arrray of fixed size
//The only way to find a message that produces a given hash is to attempt a brut force