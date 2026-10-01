const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(
            req.user.userId
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get profile"
        });
    }
};

// .select("-password")

const updateProfile = async (req, res) => {
    try {
        const { name, mobile } = req.body;

        const user = await User.findById(
            req.user.userId
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (name !== undefined) {
            user.name = name;
        }

        if (mobile !== undefined) {
            user.mobile = mobile;
        }

        await user.save();

        const updatedUser = await User.findById(
            req.user.userId
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Profile update failed"
        });
    }
};

// Cloudinary image upload

const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image"
            });
        }

        const user = await User.findById(
            req.user.userId
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.profileImage.public_id) {
            await cloudinary.uploader.destroy(
                user.profileImage.public_id
            );
        }

        const uploadResult = await new Promise(
            (resolve, reject) => {

                const uploadStream =
                    cloudinary.uploader.upload_stream(
                        {
                            folder: "user_profiles"
                        },

                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );

                uploadStream.end(req.file.buffer);
            }
        );

        user.profileImage = {
            secure_url: uploadResult.secure_url,
            public_id: uploadResult.public_id
        };

        await user.save();

        const updatedUser = await User.findById(
            req.user.userId
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Profile image uploaded successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Image upload failed",
            error: error.message
        });
    }
};

// Export user controller

module.exports = {
    getProfile,
    updateProfile,
    uploadProfileImage
};

// User routes
const express = require("express");
const Joi = require("joi");

const authMiddleware = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const {
    getProfile,
    updateProfile,
    uploadProfileImage
} = require("../controllers/userController");

const router = express.Router();

// Update validation
const updateProfileSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50),

    mobile: Joi.string()
        .pattern(/^[0-9]{10}$/)
}).min(1);

// Validation
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

// GET
router.get(
    "/profile",
    authMiddleware,
    getProfile
);

// PUT
router.put(
    "/profile",
    authMiddleware,
    validate(updateProfileSchema),
    updateProfile
);

// Image
router.put(
    "/profile/image",
    authMiddleware,
    upload.single("image"),
    uploadProfileImage
);

// Finally
module.exports = router;