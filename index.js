require("dotenv").config();
const express = require("express")
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const connectDatabase = require('./db/DataBase.js');
const Payment = require("./models/payment.js")

connectDatabase();

app.use(express.json());
app.use(cors());


app.post("/api/create-checkout-session",async(req,res)=>{
    try {
        const {products} = req.body;
        // console.log(products[0].tokenPrice);
    
        const lineItems = products.map((product)=>({
            price_data:{
                currency:"inr",
                product_data:{
                    name:product.tokenPrice,
                },
                unit_amount:product.tokenPrice * 100,
            },
            quantity:product.quant
        }))

        const isAuthentic = (products[0].tokenPrice === NaN) && (products[0].toETH === NaN);
    
        // console.log({ lineItems })
    
        const session = await stripe.checkout.sessions.create({
            payment_method_types:["card"],
            line_items:lineItems,
            mode:"payment",
            success_url:"http://localhost:3000/",
            cancel_url:"http://localhost:3000/cancel",
        });

        if(!isAuthentic){
            const paydb = new Payment({
                totalAmount:products[0].tokenPrice,
                totalTokenEth:products[0].toETH,
                userAccount:products[0].userAccount
            })
            await paydb.save();
            res.json({id:session.id,paydb})
        }
    } catch (error) {
        console.log({ error: error })
    }

})

app.listen(7000,()=>{
    console.log("server start")
})