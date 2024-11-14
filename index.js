require('dotenv').config();
const app=require('./app');
const {connect}=require('./config/db')
const cloudinary=require("cloudinary");

//connect with database
connect();

//cloudinary config
cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.API_KEY,
    api_secret:process.env.API_SECRET,
})

app.listen(process.env.PORT,()=>{
    console.log(`Server is listening at port ${process.env.PORT}`);
})
