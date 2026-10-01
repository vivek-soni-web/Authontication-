const express = require("express");
const Joi = require("joi");
const rateLimit = require("express-rate-limit");

const {
    signup,
    verifyOTP,
    resendOTP,
    login
} = require("../controllers/authController");

const router = express.Router();

const signupSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),

    email: Joi.string()
        .email()
        .required(),

    password: Joi.string()
        .min(6)
        .max(100)
        .required()
});

const otpSchema = Joi.object({
    email: Joi.string()
        .email()
        .required(),

    otp: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .required()
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required(),

    password: Joi.string()
        .required()
});

const resendOtpSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
});

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 3,

    message: {
        success: false,
        message: "Too many OTP requests. Please try again later."
    }
});

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        next();
    };
};

router.post(
    "/signup",
    validate(signupSchema),
    signup
);

router.post(
    "/verify-otp",
    validate(otpSchema),
    verifyOTP
);

router.post(
    "/resend-otp",
    otpLimiter,
    validate(resendOtpSchema),
    resendOTP
);

router.post(
    "/login",
    validate(loginSchema),
    login
);

module.exports = router;