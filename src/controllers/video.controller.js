import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    let filter = {};
    if (query) {
    filter.title = { $regex: query, $options: "i" };
    }
    if (userId) {
        filter.owner = userId;
    }

    let sortOptions = {};
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1;
    const skip = (pageNumber - 1) * limitNumber;

    const videos = await Video.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNumber);

    const totalVideos = await Video.countDocuments(filter);

    res.status(200).json({
    success: true,
    totalVideos,
    currentPage: pageNumber,
    totalPages: Math.ceil(totalVideos / limitNumber),
    videos
    });

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video


    //check for the required fields 
    if(!title || title.trim()==="" || !description ||description.trim()===""){
        throw new ApiError(400 , "Tittle and Description can't be empty");
    }
    
    if(!req.files || !req.files.videoFile || !req.files.videoFile[0]){
        throw new ApiError(400 , "Video is required")
    }

    if(!req.files.thumbnail || !req.files.thumbnail[0]){
        throw new ApiError(400 , "Thumbnail is required")
    }

    // get path
    const videoLocalPath = req.files?.videoFile?.[0]?.path;

    const thumbnailLocalPath = req.files?.thumbnail?.[0].path;

    const videoPath = await uploadOnCloudinary(videoLocalPath)
    const thumbnailPath = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoPath){
        throw new ApiError(400 , "video is required")
    }
    if(!thumbnailPath){
        throw new ApiError(400 , "Thumbnail is required")
    }

    const video = await Video.create(
        {
            videoFile:videoPath.url,
            thumbnail:thumbnailPath.url,
            title ,
            description,
            duration:videoPath.duration,
            views:0,
            isPublished:true , 
            owner: req.user._id

        }
    )

    

    return res.status(201).json( new ApiResponse(201,video , "Video Published successfully"))



})

const getVideoById = asyncHandler(async (req, res) => {
    // const { videoId } = req.params
    const { videoId } = req.params
    //TODO: get video by id
    console.log("Raw ID:", videoId);
    console.log("Length:", videoId?.length);
    console.log("Is Valid:", mongoose.Types.ObjectId.isValid(videoId));

    console.log(req.params)
    if(!videoId){
        throw new ApiError(400 , "VideoID is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId).populate(
        "owner",
        "username email avatar"  
    )

    if(!video){
        throw new ApiError(404 , "Video Not Found");
    }

    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    );

})

const updateVideo = asyncHandler(async (req, res) => {
    // const { videoId } = req.params
    const { videoId } = req.query

    const {description ,  title} = req.body
    //TODO: update video details like title, description, thumbnail


    

    if((!title || title.trim()==="" ) && ( !description ||description.trim()==="") && (!req.file ) ){
        throw new ApiError(400 , "All fields cannot be empty");
    }

    

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID");
    }
    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }
    const newDesc = ( !description ||description.trim()==="")? video.description :  description;
    const newTittle = (!title || title.trim()==="" )?video.title : title; 

    
    let thumbnailPathURL = video.thumbnail;

    if (req.file) {
        const thumbnailLocalPath = req.file.path;
        const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        thumbnailPathURL = uploadedThumbnail.url;
    }
    
    const updatedVideo = await  Video.findByIdAndUpdate(videoId,
        {
            $set:{
                description:newDesc,
                title:newTittle,
                thumbnail:thumbnailPathURL
            }
        },{new:true}
    )
    return res.status(201).json( new ApiResponse(201,updatedVideo , "Details update dsuccessfully"))


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.query
    //TODO: 

    if(!videoId){
        throw new ApiError(400 , "VideoID is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404 , "Video Not Found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    await Video.findByIdAndDelete(videoId);
    return res.status(200).json(
        new ApiResponse(200, video, "Video deleated  successfully")
    );
    
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400 , "VideoID is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID");
    }


    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video Not Found");
    }

    video.isPublished = !video.isPublished;
        
    await video.save() ;

    return res.status(200).json(
        new ApiResponse(200, video, "Publish Status Toggled Successfully")
    );

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}