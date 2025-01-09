const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Initialize app and middlewares
const app = express();
app.use(bodyParser.json());
app.use(cors());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/expenses', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.once('open', () => console.log('Connected to MongoDB'));

// Mongoose schema
const memberSchema = new mongoose.Schema({
  name: String,
  balance: { type: Number, default: 0 },
});

const expenseSchema = new mongoose.Schema({
  description: String,
  totalAmount: Number,
  paidBy: String,
  members: [
    {
      member: String,
      amount: Number,
    },
  ],
});

const Member = mongoose.model('Member', memberSchema);
const Expense = mongoose.model('Expense', expenseSchema);

// Routes
app.post('/members', async (req, res) => {
  const member = new Member(req.body);
  await member.save();
  res.json(member);
});

app.get('/members', async (req, res) => {
  const members = await Member.find();
  res.json(members);
});

app.post('/expenses', async (req, res) => {
  const expense = new Expense(req.body);
  await expense.save();

  const { totalAmount, paidBy, members } = req.body;

  // Update the payer's balance
  const paidMember = await Member.findOne({ name: paidBy });
  if (!paidMember) {
    return res.status(400).json({ error: `Payer "${paidBy}" does not exist.` });
  }
  paidMember.balance += totalAmount;
  await paidMember.save();

  // Update balances for split members
  for (const member of members) {
    const { member: memberName, amount } = member;
    const targetMember = await Member.findOne({ name: memberName });

    if (!targetMember) {
      return res.status(400).json({ error: `Member "${memberName}" does not exist.` });
    }

    targetMember.balance -= amount;
    await targetMember.save();
  }

  res.json(expense);
});



app.post('/settle', async (req, res) => {
  const { from, to, amount } = req.body;

  const fromMember = await Member.findOne({ name: from });
  const toMember = await Member.findOne({ name: to });

  fromMember.balance += amount;
  toMember.balance -= amount;

  await fromMember.save();
  await toMember.save();

  res.json({ message: 'Settlement done.' });
});

app.get('/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find(); // Replace `Expense` with your MongoDB collection or model
    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching expenses');
  }
});

// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
