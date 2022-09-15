const nodemailer = require("nodemailer")
const nodeMailerConfig = require("./nodemailerConfig")

// async..await is not allowed in global scope, must use a wrapper
const sendEmail = async ({ to, subject, html }) => {
  let testAccount = await nodemailer.createTestAccount()

  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport(nodeMailerConfig)

  // send mail with defined transport object
  return transporter.sendMail({
    from: '"natalia Ciampelletti 👻" <gabi@shaw.ca>', // sender address
    to, // list of receivers
    subject, // Subject line
    html, // html body
    text: "",
  })
}

module.exports = sendEmail
