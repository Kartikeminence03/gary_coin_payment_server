const nodemailer = require("nodemailer");


const sendEmail = async(data,req,res)=>{
    let testAccount = await nodemailer.createTestAccount();

  const transporter = await nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_ID,
      pass: process.env.MP,
    },
  })

  const info = await transporter.sendMail({
    from: '"Hey 👻" <abc@gmail.com>', // sender address
    to: data.to, // list of receivers
    subject: data.subject, // Subject line
    text: data.text, // plain text body
    html: data.html, // html body
  });

  // console.log("Message sent: %s", info.messageId);
  // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}


module.exports= sendEmail;