require("dotenv").config();
const express = require("express")
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const connectDatabase = require('./db/DataBase.js');
const Payment = require("./models/payment.js");
const { baseUrlCancel, baseUrlSuccess } = require("./baseUrl.js");

connectDatabase();

//Stripe
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    let data;
    let eventType;

    // Check if webhook signing is configured.
    const webhookSecret = process.env.STRIPE_WEB_HOOK;
    // console.log({ webhookSecret })

    if (webhookSecret) {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;
      let signature = req.headers["stripe-signature"];

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed:  ${err}`);
        return res.sendStatus(400);
      }
      // Extract the object from the event.
      data = event.data.object;
      eventType = event.type;
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      data = req.body.data.object;
      eventType = req.body.type;
    }

    // Handle the checkout.session.completed event
    if (eventType === "checkout.session.completed") {
      stripe.customers
        .retrieve(data.customer)
        .then(async (customer) => {
          try {
            // CREATE ORDER
            pay(customer, data);
          } catch (err) {
            console.log(typeof pay,"PPPPPPPPP<<<<<<<<<<");
            console.log(err,"EEEEEEEEEEE>>>>>>>>>>>>");
          }
        })
        .catch((err) => console.log(err.message,"<<<<<<<<<======>>>>>>>>>>>"));
    }

    res.status(200).end();
}
);
app.use(express.json())
app.use(cors());

app.post("/api/create-checkout-session",async(req,res)=>{
    try {
        const {products} = req.body;

        const customer = await stripe.customers.create({
            metadata: {
              userId: req.body.products[0].userAccount,
              cart: JSON.stringify(req.body.products[0]),
            },
          });
    
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

        const session = await stripe.checkout.sessions.create({
            payment_method_types:["card"],
            line_items:lineItems,
            mode:"payment",
            customer: customer.id,
            success_url:`${baseUrlSuccess}`,
            cancel_url:`${baseUrlCancel}`,
        });
        res.json({id:session.id})
    } catch (error) {
        console.log({ error: error })
    }

})

const pay = async (customer, data)=>{
    const tok = await customer.metadata.cart;
    let cartData = JSON.parse(tok);
    // console.log(data.amount_total/100,"====>>>>>>>>>>");
    // console.log(tok.tokenPrice,tok.toETH,"=>");
     const paydb = new Payment({
        totalAmount:data.amount_total/100,
        totalTokenEth:cartData.toETH,
        userAccount:cartData.userAccount,
        customerName:data.customer_details.name,
        userEmail:customer.email,
        customerId:customer.id,
        paymentRefund:data.payment_intent,
    })
    try {
        const savedPayment = await paydb.save();
        console.log("Processed Order:");
      } catch (err) {
        console.log(err);
      }
};

app.post('/api/refundPayment-st', async(req,res)=>{
    try {
        const refund = await stripe.refunds.create({
            payment_intent: 'pi_3OD4fxSGgPa6DtpS0sqvBbeO',
        });
        console.log('Refund processed:', refund);
        return refund;
    } catch (error) {
        console.log(error);
    }
})


app.listen(7000,()=>{
    console.log("server start")
})