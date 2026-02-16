import Mailgen from "mailgen";

const emailVerificationMailgenContent =(username , verificationUrl) => {
    return{
        body:{
            name:username , 
            intro:"Welcome to our app! we're excited to have you on board.",
            action:{
                instructions:"to verify your email please click on the following link",
                button:{
                    color:"#1aae5aff",
                    text:"verify your email",
                    link:verificationUrl
                }
            },
            outro:"Need help , or have questions? Just reply to this email"
        }
    }
}



const forgotPasswordMailgenContent =(username , passwordResetUrl) => {
    return{
        body:{
            name:username , 
            intro:"We got a request to reset password of your account",
            action:{
                instructions:"to reset password click the following button or link",
                button:{
                    color:"#22bc66",
                    text:"verify your email",
                    link: passwordResetUrl
                }
            },
            outro:"Need help , or have questions? Just reply to this email"
        }
    }
}

export {
    emailVerificationMailgenContent , forgotPasswordMailgenContent
}