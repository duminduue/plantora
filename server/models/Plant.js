
const mongoose = require('mongoose')

const plantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plant name is required'],
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      required: [true, 'Plant category is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Plant price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stock: {
      type: Number,
      required: true,
      default: 100,
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be a whole number',
      },
    },
    description: {
      type: String,
      required: [true, 'Plant description is required'],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    sunlight: {
      type: String,
      default: 'Not specified',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.models.Plant || mongoose.model('Plant', plantSchema)
