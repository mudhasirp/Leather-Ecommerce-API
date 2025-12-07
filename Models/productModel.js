const mongoose = require("mongoose")
const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },
        stock: {
            type: Number,
            default: 0,
            required: true,
        },

        images: [
            {
                type: String,
                required: true,
            },
        ],
        isActive: {
            type: boolean,
            default: true
        },
    },
    { timestamps: true }

)