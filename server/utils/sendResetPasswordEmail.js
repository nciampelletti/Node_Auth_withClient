const sendEmail = require("./sendEmail")

const sendResetPasswordEmail = async ({ name, email, token, origin }) => {
  const resetUrl = `${origin}/user/reset-password?token=${token}&email=${email}`

  const message = `<p>Please reset the password by clicking on the following link: <a href='${resetUrl}'>click here to reset your Password</a></p>`

  return sendEmail({
    to: email,
    subject: "Password Reset",
    html: `<h4>Hello ${name}</h4>${message}`,
  })
}

module.exports = sendResetPasswordEmail
