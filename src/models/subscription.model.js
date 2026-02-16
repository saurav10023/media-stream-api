import mongoose ,{Schema} from "mongoose";

const subscriptionSchema = new Schema (
    {
        // that 
        subscriber:{
            type : Schema.Types.ObjectId,
            ref:"User"
        },

        // that users who are the subscrbers are added to the channel
        channel:{
            type:Schema.Types.ObjectId ,
            ref:"User"
        }
    },
    {timestamps:true}
)

export const Subscription = mongoose.Model("Subscription" , subscriptionSchema)