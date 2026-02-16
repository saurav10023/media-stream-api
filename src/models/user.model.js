import mongoose  , {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
const userSchema = new Schema( 
    {
        username : {
        type: String , 
        required: true ,
        unique: true ,
        lowercase : true ,
        trim: true , 
        index: true // searching field ke liye optimization
        },
        email : {
        type: String , 
        required: true ,
        unique: true ,
        lowercase : true ,
        trim: true , 
        },
        fullName : {
        type: String , 
        required: true ,
        lowercase : true ,
        trim: true , 
        },
        avatar : {
            type : String , //cloudnary url
            required : true ,
        },
        coverImage: {
            type: String
        },
        watchHistory: [
            {
                type : Schema.Types.ObjectId , 
                ref : "Video"
            }
        ],
        password : {
            type: String ,
            required: [true , 'Password is required'] 
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps:true
    }

)
// ()=>{} cannot be used in prev call back function  as it doesnot have context
// userSchema.pre("save" , async function(next) {
//     if(!this.isModified("password"))return next();

//     this.password = await bcrypt.hash(this.password, 10)
//     next();
// })

// chatgpt 
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});




userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password ,this.password)
}


// jwt is a bearer token 
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
        _id:this._id , 
        email:this.email,
        fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
        _id:this._id 
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
    )
}

export const User = mongoose.model("User" , userSchema)

