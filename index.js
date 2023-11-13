require("dotenv").config();
const express = require("express")
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

app.use(express.json());
app.use(cors());


app.post("/api/create-checkout-session",async(req,res)=>{
    const {products} = req.body;

    const lineItems = products.map((product)=>({
        price_data:{
            currency:"inr",
            product_data:{
                name:product.dish,
            },
            unit_amount:product.price * 100,
        },
        quantity:product.qnty
    }))
})

app.listen(7000,()=>{
    console.log("server start")
})