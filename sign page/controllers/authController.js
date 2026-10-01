const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const OTP = require("../models/OTP");

const generateOTP = require("../utils/generateOTP");
const sendOTPEmail = require("../utils/sendEmail");


// =======================
// SIGNUP
// =======================

const signup = async (req, res) => {

    try {

        // 1. User se data lena
        const { name, email, password } = req.body;

        // 2. Email ko lowercase karna
        const normalizedEmail = email.toLowerCase();

        // 3. Check karna ki user pehle se hai ya nahi
        let user = await User.findOne({
            email: normalizedEmail
        });

        // 4. Agar user already verified hai
        if (user && user.isVerified) {

            return res.status(400).json({
                success: false,
                message: "User already exists"
            });

        }

        // 5. Password ko hash karna
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // 6. Agar user hai lekin verified nahi hai
        if (user && !user.isVerified) {

            user.name = name;
            user.password = hashedPassword;

            await user.save();

        } else {

            // 7. Naya user create karna
            user = await User.create({
                name: name,
                email: normalizedEmail,
                password: hashedPassword
            });

        }

        // 8. 6 digit OTP generate karna
        const otp = generateOTP();

        // 9. Purana OTP delete karna
        await OTP.deleteMany({
            email: normalizedEmail
        });

        // 10. Naya OTP database mein save karna
        await OTP.create({
            email: normalizedEmail,

            otp: await bcrypt.hash(otp, 10),

            expiresAt: new Date(
                Date.now() + 10 * 60 * 1000
            )
        });

        // 11. OTP email par bhejna
        await sendOTPEmail(
            normalizedEmail,
            otp
        );

        // 12. Response bhejna
        return res.status(201).json({
            success: true,
            message: "Signup successful. OTP sent to your email."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Signup failed",
            error: error.message
        });
    }
};
// =======================
// VERIFY OTP
// =======================

const verifyOTP = async (req, res) => {

    try {

        // 1. Email aur OTP lena
        const { email, otp } = req.body;

        const normalizedEmail = email.toLowerCase();

        // 2. User find karna
        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }

        // 3. OTP find karna
        const otpRecord = await OTP.findOne({
            email: normalizedEmail
        });

        if (!otpRecord) {

            return res.status(400).json({
                success: false,
                message: "OTP not found or expired"
            });

        }

        // 4. OTP expire hua ya nahi
        if (new Date() > otpRecord.expiresAt) {

            await OTP.deleteOne({
                _id: otpRecord._id
            });

            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });

        }

        // 5. OTP check karna
        const isCorrectOTP = await bcrypt.compare(
            otp,
            otpRecord.otp
        );

        if (!isCorrectOTP) {

            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });

        }

        // 6. User ko verified karna
        user.isVerified = true;

        await user.save();

        // 7. OTP delete karna
        await OTP.deleteOne({
            _id: otpRecord._id
        });

        return res.status(200).json({
            success: true,
            message: "Account verified successfully"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "OTP verification failed"
        });

    }
};
// =======================
// RESEND OTP
// =======================

const resendOTP = async (req, res) => {

    try {

        // 1. Email lena
        const { email } = req.body;

        const normalizedEmail = email.toLowerCase();

        // 2. User find karna
        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }

        // 3. Agar already verified hai
        if (user.isVerified) {

            return res.status(400).json({
                success: false,
                message: "User is already verified"
            });

        }

        // 4. Naya OTP generate karna
        const otp = generateOTP();

        // 5. Purana OTP delete karna
        await OTP.deleteMany({
            email: normalizedEmail
        });

        // 6. Naya OTP save karna
        await OTP.create({

            email: normalizedEmail,

            otp: await bcrypt.hash(otp, 10),

            expiresAt: new Date(
                Date.now() + 10 * 60 * 1000
            )

        });

        // 7. Email bhejna
        await sendOTPEmail(
            normalizedEmail,
            otp
        );

        return res.status(200).json({
            success: true,
            message: "New OTP sent successfully"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to resend OTP"
        });

    }
};
// =======================
// LOGIN
// =======================

const login = async (req, res) => {

    try {

        // 1. Email aur password lena
        const { email, password } = req.body;

        const normalizedEmail = email.toLowerCase();

        // 2. User find karna
        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }

        // 3. Check user verified hai ya nahi
        if (!user.isVerified) {

            return res.status(403).json({
                success: false,
                message: "Please verify your email first"
            });

        }

        // 4. Password check karna
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }

        // 5. JWT token banana
        const token = jwt.sign(

            {
                userId: user._id
            },

            process.env.JWT_SECRET,

            {
                expiresIn: "7d"
            }

        );

        // 6. Token client ko bhejna
        return res.status(200).json({

            success: true,

            message: "Login successful",

            token: token

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Login failed"
        });

    }
};
module.exports = {
    signup,
    verifyOTP,
    resendOTP,
    login
};