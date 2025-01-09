const mongoose = require('mongoose');

// Expense Schema
const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paidBy: {
    type: String,
    required: true,
  },
  members: [
    {
      member: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
    },
  ],
});

// Export the model
module.exports = mongoose.model('Expense', expenseSchema);
