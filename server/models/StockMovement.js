const mongoose = require('mongoose')

const stockMovementSchema = new mongoose.Schema({
  plant: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', default: null },
  plantName: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, enum: ['Restock', 'Sale', 'Adjustment', 'Plant created'], required: true },
  quantityChange: { type: Number, required: true, validate: Number.isInteger },
  stockBefore: { type: Number, required: true, min: 0 },
  stockAfter: { type: Number, required: true, min: 0 },
  orderNumber: { type: String, default: '' },
  note: { type: String, default: '', maxlength: 300 },
}, { timestamps: true })

module.exports = mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema)
