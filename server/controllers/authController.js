const User = require("../models/User")
const Token = require("../models/Token")

const { StatusCodes } = require("http-status-codes")
const CustomError = require("../errors")
const { attachCookiesToResponse, createTokenUser } = require("../utils")
const crypto = require("crypto")
const sendVerficationEmail = require("../utils/sendVerficationEmail")

/*
*
register
*
*/
const register = async (req, res) => {
  const { email, name, password } = req.body

  const emailAlreadyExists = await User.findOne({ email })
  if (emailAlreadyExists) {
    throw new CustomError.BadRequestError("Email already exists")
  }

  // first registered user is an admin
  const isFirstAccount = (await User.countDocuments({})) === 0
  const role = isFirstAccount ? "admin" : "user"

  const verificationToken = crypto.randomBytes(40).toString("hex")

  const user = await User.create({
    name,
    email,
    password,
    role,
    verificationToken,
  })

  //server
  const host = req.get("host")
  const proto = req.protocol
  const originOr = `${proto}://${host}`
  //console.log(originOr)

  //client
  const forwardedHost = req.get("x-forwarded-host")
  const forwardedProtocol = req.get("x-forwarded-proto")

  const origin = `${forwardedProtocol}://${forwardedHost}`
  console.log(origin)

  await sendVerficationEmail({
    name: user.name,
    email: user.email,
    verificationToken: user.verificationToken,
    origin,
  })

  //IMPORTANT!!!
  //send verification token back only whilre testing in Postman
  res.status(StatusCodes.CREATED).json({
    msg: "Success. Please check your email to verify the account.",
    // verificationToken: user.verificationToken,
  })
}

/*
*
login
*
*/
const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw new CustomError.BadRequestError("Please provide email and password")
  }
  const user = await User.findOne({ email })

  if (!user) {
    throw new CustomError.UnauthenticatedError("Invalid Credentials")
  }
  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("Invalid Credentials")
  }

  if (!user.isVerified) {
    throw new CustomError.UnauthenticatedError("Please verify your email")
  }

  const tokenUser = createTokenUser(user)

  //create refresh token
  let refreshToken = ""

  //check for exisiting token
  const existingToken = await Token.findOne({ user: user._id })

  if (existingToken) {
    const { isValid } = existingToken
    if (!isValid) {
      throw new CustomError.UnauthenticatedError("Invalid credentials")
    }
    refreshToken = existingToken.refreshToken

    attachCookiesToResponse({ res, user: tokenUser, refreshToken })

    res.status(StatusCodes.OK).json({ user: tokenUser })
    return
  }

  refreshToken = crypto.randomBytes(40).toString("hex")
  const userAgent = req.headers["user-agent"]
  const ip = req.ip

  const userToken = { refreshToken, userAgent, ip, user: user._id }

  await Token.create(userToken)

  attachCookiesToResponse({ res, user: tokenUser, refreshToken })

  res.status(StatusCodes.OK).json({ user: tokenUser })
}

/*
*
logout
*
*/
const logout = async (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now() + 1000),
  })
  res.status(StatusCodes.OK).json({ msg: "user logged out!" })
}

/*
*
verifyEmail
*
*/
const verifyEmail = async (req, res) => {
  const { verificationToken, email } = req.body

  const user = await User.findOne({ email })

  if (!user) {
    throw new CustomError.UnauthenticatedError("Invalid Credentials")
  }

  if (verificationToken !== user.verificationToken) {
    throw new CustomError.UnauthenticatedError("Tokens dont match or expired")
  }

  user.isVerified = true
  user.verified = Date.now()
  user.verificationToken = ""

  await user.save()

  res.status(StatusCodes.OK).json({ msg: "email Verified" })
}

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
}
