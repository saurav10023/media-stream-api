import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400 , "Not a Valid Video Id");
    }

    
    const skip = (pageNumber - 1) * limitNumber;

    const comments = await Video.aggregate(
        [
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"video",
                as : "allComments",
                pipeline: [
                { $sort: { createdAt: -1 } } ]
                },
            },
            {
                $addFields:{
                    commentsCount:{
                        $size:"$allComments"
                    },
                    paginatedComments: {
                    $slice: ["$allComments", skip, limitNumber]
                    }

                }
            },
            {
                $project:{
                    videoFile:1,
                    title:1,
                    owner:1,
                    commentsCount:1,
                    paginatedComments:1
                }
            }
        ]
    )
    if(!comments?.length){
        throw new ApiError(404 , "Video does not exist")
    }

    return res.status(200)
    .json(new ApiResponse (200 , comments[0] , "Comments Catched Successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const {content , video} = req.body

    if(!content.trim()){
        throw new ApiError(400 , "Content Can't be Empty")
    }
    if (!video || !mongoose.Types.ObjectId.isValid(video)) {
        throw new ApiError(400, "Valid video ID is required");
    }

    let comment;

    try {
        comment = await Comment.create(
            {
            content,
            video,
            owner:req.user._id
            }
        )
    } catch (error) {   
        throw new ApiError(500 , "Problem in creating comment")
    }

    // const createdComment = await Comment.findById(comment._id)

    // if(!createdComment){
    //     throw new ApiError(500 , "Somthing went Wrong while creating comment")
    // }
    const populatedComment = await comment.populate(
        "owner",
        "fullName username avatar"
    );

    return res.status(200)
    .json( new ApiResponse(200 ,populatedComment, "comment created Successfully"))



})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId } = req.params
    const {content} = req.body

    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400 , "Not a valid commentID");
    }

    if(!content || content.trim() === ""){
        throw new ApiError(400 , "New Content field Cannot be empty");
    }

    const userId = req.user._id;
    const comment = await  Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404 , "Comment not Found")
    }
    if(comment.owner.toString() !== userId.toString()){
        throw new ApiError(403 , "Not Authorized to Update")
    };

    comment.content = content ;

    
    await comment.save();
    return res.status(200)
    .json(new ApiResponse(200 , comment , "comment updated Successfully")
    );


})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    if(!commentId){
        throw new ApiError(400 , "commentID is required")
    }
    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400, "Invalid Comment ID");
    }

    const userId = req.user._id;
    const comment = await  Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404 , "Comment not Found")
    }
    if(comment.owner.toString() !== userId.toString()){
        throw new ApiError(403 , "Not Authorized to Delete")
    };

    await Comment.findByIdAndDelete(commentId);

    return res.status(200)
    .json(new ApiResponse(200 , comment , "This comment is Deleted")
    );

    

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }