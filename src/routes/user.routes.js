import { Router } from "express";
import { 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails, 
    updateUserAvatarPath, 
    updateUserCoverImage } 
from "../controllers/user.controller.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import {upload} from "../middlewares/multer.middleware.js"

const router=Router()
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",maxCount:1
        } , 
        {
            name:"coverImage" , maxCount:1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

// secured routes 
router.route("/logout").post(verifyjwt ,logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/changepassword").post(changeCurrentPassword)

router.route("/changefullname-email").patch(verifyjwt , updateAccountDetails)

router.route("/current-user").get(verifyjwt , getCurrentUser)

router.route("/avatarupdate").patch(verifyjwt , upload.single("avatar") , updateUserAvatarPath);//patch up update specific part of data
router.route("/coverImage").patch(verifyjwt , upload.single("coverImage") , updateUserCoverImage);
router.route("/c/:username").get(verifyjwt , getUserChannelProfile)

router.route("/history").get(verifyjwt , getWatchHistory);



export default router;