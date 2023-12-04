require("dotenv").config();
const express = require("express");
const ethers = require('ethers');
const url = process.env.NODE_URL;
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const connectDatabase = require('./db/DataBase.js');
const Payment = require("./models/payment.js");
const { baseUrlCancel, baseUrlSuccess } = require("./baseUrl.js");
const tokenPresale = require('./abi/TokenPreSale.json');
const sendEmail = require("./emailMessage.js");

connectDatabase();
const tokenPresaleaddress = process.env.TOKENPRESALEADDRESS;
let stripeWebhookErr;

//Stripe
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  let data;
  let eventType;

  // Check if webhook signing is configured.
  const webhookSecret = process.env.STRIPE_WEB_HOOK;

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
          cryptoPaymentAdmin(customer,data)
        } catch (err) {
          console.log(err,"EEEEEEEEEEE>>>>>>>>>>>>");
        }
      })
      .catch((err) => {
        console.log(err.message,"<<<<<<<<<======>>>>>>>>>>>")
        stripeWebhookErr= err
      });
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
              currency:"usd",
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

//Data Base
const pay = async (customer, data)=>{
    const tok = await customer.metadata.cart;
    let cartData = JSON.parse(tok);
     const paydb = new Payment({
        totalAmount:data.amount_total/100,
        currency:cartData.crypto,
        totalTokenEth:cartData.toETH,
        userAccount:cartData.userAccount,
        customerName:data.customer_details.name,
        userEmail:customer.email,
        customerId:customer.id,
        paymentRefund:data.payment_intent,
    })
    try {
        const savedPayment = await paydb.save();
      } catch (err) {
        console.log(err);
      }
};

//Crypto Payment Admin function
const cryptoPaymentAdmin = async(customer,data)=>{
  try {
    const tok = await customer.metadata.cart;
    let cartData = JSON.parse(tok);
    const fiatPrice = BigInt(cartData.tokenPrice*10**8);
    const provider = new ethers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY,provider);
    const signer = wallet.connect(provider);
    const tokenPresaleContract = new ethers.Contract(tokenPresaleaddress, tokenPresale.abi, provider)
    const tokenPresaleContractWithSigner = tokenPresaleContract.connect(signer);
    const RecieveTokens = await tokenPresaleContractWithSigner.registerFiatUsers(signer.address,fiatPrice);
    const buyReciept = await RecieveTokens.wait();
    console.log(tokenPresaleContractWithSigner);
  } catch (error) {
    console.log(error);
  }
};


app.post('/api/refundPayment-fiat', async (req, res) => {
  try {
      const { userEmail } = req.body;
      const findUser = await Payment.findOne({ userEmail });
      
      if (findUser) {
          const pay_intent = findUser.paymentRefund;

          const refund = await stripe.refunds.create({
              payment_intent: pay_intent,
          });

          // Delete the user
          const deleteUser = await Payment.deleteOne({ userEmail });

          if (deleteUser.deletedCount > 0) {
              console.log("User deleted");
          } else {
              console.log("User not found");
          }

          if (refund.status) {
              console.log("Refund Done");
          }

          res.json({ refund });
      } else {
          console.log("User not found");
          res.status(404).json({ error: "User not found" });
      }
  } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/send-message',async(req,res)=>{
  try {
    const {firstName,lastName,phone,perEmail,digiMessage} = req.body;
    const email = 'kartik.eminence@gmail.com ';
    const resetURL = `<h1>Hi DigiSoul</h1> <h4>Message: ${digiMessage}</h4> <p>Name: ${firstName} ${lastName}</p> <p>Phone Number: ${phone}</p> <p>Email: ${perEmail}</p>`;
    const data = {
      to: email,
      text: "Hey User",
      subject: "Message to DigiSoul.",
      html: resetURL,
    };
    sendEmail(data);
    res.json({message:"Email is send to ka...com"})
  } catch (error) {
    res.json({error})
  }

  // console.log(data);
})


app.listen(7000,()=>{
    console.log("server start")
})