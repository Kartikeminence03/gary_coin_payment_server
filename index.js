require("dotenv").config();
const express = require("express")
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

app.use(express.json());
app.use(cors());


app.post("/api/create-checkout-session",async(req,res)=>{
    try {
        const {products} = req.body;
        // console.log(products);
    
        const lineItems = products.map((product)=>({
            price_data:{
                currency:"inr",
                product_data:{
                    name:product.tokenPrice,
                },
                unit_amount:123 * 100,
            },
            quantity:product.quant
        }))
    
        // console.log({ lineItems })
    
        const session = await stripe.checkout.sessions.create({
            payment_method_types:["card"],
            line_items:lineItems,
            mode:"payment",
            success_url:"http://localhost:3000/sucess",
            cancel_url:"http://localhost:3000/cancel",
        });
    
        res.json({id:session.id})
    } catch (error) {
        console.log({ error: error.raw.message })
    }

})

app.listen(7000,()=>{
    console.log("server start")
})