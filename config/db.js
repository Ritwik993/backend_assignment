const mongoose=require('mongoose');

exports.connect=()=>{
    mongoose.connect(process.env.DB_URL)
    .then(()=>console.log(`DB connected successfully`))
    .catch((error)=>{
        console.log(`DB CONNECTION ISSUES`);
        console.log(error);
        process.exit(1);
    })
}


