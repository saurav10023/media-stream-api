import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt  from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) =>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken  = refreshToken;
        await user.save({validateBeforeSave: false});
        return {accessToken , refreshToken}

    }catch(error){
        throw new ApiError(500 , "Somthing went wrong while generating refresh and access token")

    }
}

const registerUser = asyncHandler( async (req ,res) => {
    // get user details from frontend
    // validation - not empty 
    // check if user already exists : check from username and email 
    // check for images and avatar 
    // upload them to cloudinary

    // create user object - create entry in db 
    // remove password and refresh token field from response 
    // check for response 
    // return res

    const {fullName , email ,username , password} = req.body
    console.log(req.body)
    console.log("email:" , email);
    // if(fullName === ""){
    //     throw new ApiError (400 , "fullname is required" , )
    // }

    // some - condition lagake check kar sakte hai
    if(
        [fullName , email , username , password].some( (field) => field?.trim() ==="")
    ){
        throw new ApiError(400 , "All field are reqired")
    }

    const existedUser = await User.findOne( {
        $or : [{username}, {email}]
    } )
    if(existedUser){
        throw new ApiError(409 , "user with this email or username already existed");
    }

    // middleware gives acces to some more fields 

    const avatarLocalPath =req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path ;

    if(!avatarLocalPath){throw new ApiError(400, "Avatar is required")}

    console.log("Avatar path:", avatarLocalPath);


    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    const coverImage = coverImageLocalPath? await uploadOnCloudinary(coverImageLocalPath):null;
    


    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    // const user = await User.create( {
    //     fullName,
    //     avatar:avatar.url,
    //     coverImage:coverImage?.url || "",
    //     email,
    //     password,
    //     username:username.toLowerCase()
    // })

    let user;
try {
  user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  });
} catch (error) {
  if (error.code === 11000) {
    throw new ApiError(409, "User already exists");
  }
  throw error;
}





    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500 , "Somthing went wrong while registering user")
    }

    // creating response 
    // return res.status(201).json({createdUser})  also correct

    return res.status(201).json(
        new ApiResponse(201 , createdUser , "User registered successfully")
    )


})



///////   LOGIN //////////////////


const loginUser = asyncHandler ( async (req, res) => {
    // req body->data
    // username or email 
    // find the user 
    // check password 
    // accces and refresh token  
    // send cookies

    const {email, username , password} = req.body
    
    console.log(email , username , password)

    if(!email && !username){
        throw new ApiError(400 , "username or email is required") ;
    }
    
    const user = await User.findOne({
        $or:[{username}, {email}]
    })
    if(!user){
        throw new ApiError(404 , "user does not exists");
    }
    // User mongoose wala user hai 
    // user that is made by us in this is to be used 
    const isPassWordValid = await user.isPasswordCorrect(password);
    if(!isPassWordValid){
        throw new ApiError(401 , "Invalid User credentials")
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const logedInUser = await User.findById(user._id).select( "-password -refreshToken");

    // sending cookies 

    const options = {
        httpOnly:true ,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse(200 , {user: logedInUser , accessToken , refreshToken},"User logged in Successfully")
    )



})


////////// logout///////

const  logoutUser = asyncHandler (async (req , res) => {
    await User.findByIdAndUpdate(req.user._id ,{$unset : {refreshToken:1}} , {new:true} )
    const options = {
        httpOnly:true ,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(new ApiResponse(200 , {} , "User logged out Successfully!"))
})



// to refresh access token 

const refreshAccessToken = asyncHandler( async(req ,res) => {
    try {
        const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if(!incommingRefreshToken){
            throw new ApiError(401 , "Unauthorized Access");
        }
        const decodedToken = jwt.verify(incommingRefreshToken , process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401 , "Invalid Refresh Token");
        }
    
        if(incommingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh token is epired or used");
        }
    
        const options = {
            httpOnly:true ,
            secure: true 
        }
        // const {accessToken , newRefreshToken} =await generateAccessAndRefreshTokens(user._id)
        const { accessToken, refreshToken: newRefreshToken } =await generateAccessAndRefreshTokens(user._id);


        return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , newRefreshToken , options)
        .json(
            new ApiResponse (
                200 , {accessToken , newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid Refresh Token")
    }

}  )



const changeCurrentPassword = asyncHandler((async (req , res) => {
    const {oldPassword , newPassword} = req.body
    const user =  await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400 ,  "Invalid old Password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200)
    .json(new ApiResponse(200 , {} , "Password Changed Successfully"))
}))


const getCurrentUser = asyncHandler (async (req , res) => {
    return res 
    .status(200)
    .json (new ApiResponse(200 , req.user , "Current user is fetched Successfully"));
})

const updateAccountDetails = asyncHandler (async (req , res) =>{
    const {fullName , email } = req.body

    if(!fullName || !email){
        throw new ApiError(400 , "All fields are required");
    }

    const user = await User.findByIdAndUpdate(req.user?._id 
        ,{
            $set:{fullName , email}
        },{new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200 , user , "Account details updated successfully"))
})


const updateUserAvatarPath = asyncHandler(async (req , res) => {
    const avatarLocalPath = req.file?.path 

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath) 

    if(!avatar.url){
        throw new ApiError(400 , "error while uploadig")
    }

    const user = await User.findByIdAndUpdate(req.user._id , {$set: {avatar: avatar.url}} ,{new:true}).select("-password")

    return res.status(200).json(new ApiResponse (200 , user , "Avatar Updated successfully" ))

})


const updateUserCoverImage = asyncHandler(async (req , res) => {
    const coverLocalPath = req.file?.path 

    if(!coverLocalPath){
        throw new ApiError(400 , "Cover Image file missing")
    }

    const cover = await uploadOnCloudinary(coverLocalPath) 

    if(!cover.url){
        throw new ApiError(400 , "error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(req.user._id , {$set: {coverImage: cover.url}} ,{new:true}).select("-password")

    return res.status(200).json(new ApiResponse (200 , user , "Cover Updated successfully" ))

})


const getUserChannelProfile = asyncHandler(async (req , res) => {
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400 , "Username is missing");
    }
    // aggregate returns array
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as :"Subscribers"
                //{ subscriber: ObjectId("A"), channel: ObjectId("johnId") },
                //{ subscriber: ObjectId("B"), channel: ObjectId("johnId") }
                // channel ka object id same 
                // foreignfield === localfield
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as :"SubscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$Subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$SubscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id , "$Subscribers.subscriber"]},
                        then:true ,
                        else : false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1 ,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    
    ])

    if(!channel?.length){
        throw new ApiError(404 , "Channel does not exists")
    }

    return res.status(200)
    .json(new ApiResponse(200 , channel[0] , "User channel fetched successfully"))

})


const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as: "watchHistory",

                pipeline: [
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1 , username:1 ,avatar:1
                                    }
                                }
                            ]
                        }
                    },

                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])


    return res.status(200)
    .json(
        new ApiResponse(200 , user[0] , "watch history fetched")
    )
})


export {registerUser, logoutUser , loginUser , refreshAccessToken , changeCurrentPassword ,updateUserAvatarPath , updateUserCoverImage ,updateAccountDetails ,getCurrentUser , getUserChannelProfile , getWatchHistory} ;