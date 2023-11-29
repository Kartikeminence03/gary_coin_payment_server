const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        totalAmount:Number,
        totalTokenEth:Number,
        currency:{
            type:String
        },
        userAccount: {
            type: String,
            ref: "UserAccount",
        },
        userEmail:{
            type: String,
            ref: "email"
        },
        customerId:{
            type: String
        },
        customerName:{
            type: String
        },
        paymentRefund:{
            type: String
        }
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Payment", paymentSchema);