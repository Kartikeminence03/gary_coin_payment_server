const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        totalAmount:Number,
        totalTokenEth:Number,
        userAccount: {
            type: String,
            ref: "UserAccount",
          }
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Payment", paymentSchema);