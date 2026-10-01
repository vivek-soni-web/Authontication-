const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        mobile: {
            type: String,
            default: ""
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        profileImage: {
            secure_url: {
                type: String,
                default: ""
            },

            public_id: {
                type: String,
                default: ""
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);