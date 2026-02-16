// require('dotenv').config({path:'./env'})

// second style 
import dotenv from "dotenv" ;
dotenv.config({
    path : './.env'
})
import { app } from "./app.js";


// import mongoose  from "mongoose";
// import { DB_NAME } from "./constants";

// import express from "express" ;
import connectDB from "./db/index.js";
// const app = express()

// connectDB()

console.log("🚀 index.js started");
console.log("ENV CHECK:", process.env.MONGODB_URI);


// const startServer = async () => {
//     console.log("connect db")
//   try {
//     await connectDB();
//     console.log("✅ Database connected successfully");
//   } catch (error) {
//     console.error("❌ Database connection failed", error);
//   }
// };

// startServer();


connectDB()
.then( () => {
  app.listen(process.env.PORT || 8000 , () => {
    console.log(`server is running at PORT ${process.env.PORT}`);
  })
})

.catch( (error) => {
  console.log("MongoDB connection failed" , error);
})







// ;( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error" ,(error) => {
//             console.log("ERR" , error);
//             throw error;
//         })

//         app.listen(process.env.PORT ,  ()=>{
//             console.log(`app is listening on port ${process.env.PORT}`);
//         })
//     }
//     catch (error){
//         console.error("error: " , error)
//         throw error
//     }
// })()