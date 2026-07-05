const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ASHA Referral API is running.' });
});

// Route: Get all unique ASHA names for dropdown/autocomplete selection
app.get('/api/ashas', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT asha_name FROM patients WHERE asha_name IS NOT NULL AND asha_name != '' ORDER BY asha_name ASC"
    );
    const ashasList = rows.map(row => row.asha_name);
    res.json(ashasList);
  } catch (error) {
    console.error('Error fetching ASHA names:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Route: Get patient referrals and stats for a specific ASHA
app.get('/api/patients/by-asha', async (req, res) => {
  const { asha_name } = req.query;

  if (!asha_name) {
    return res.status(400).json({ error: 'ASHA name parameter is required' });
  }

  try {
    // 1. Fetch patient list
    const [patients] = await pool.query(
      'SELECT id, name, age, gender, date_referred, DATE_FORMAT(date_referred, "%Y-%m-%d") as date_formatted FROM patients WHERE asha_name = ? ORDER BY date_referred DESC, id DESC',
      [asha_name]
    );

    // 2. Compute metrics
    const totalCount = patients.length;
    
    let totalAge = 0;
    const genderStats = { Male: 0, Female: 0, Other: 0 };
    
    patients.forEach(p => {
      totalAge += p.age;
      if (genderStats[p.gender] !== undefined) {
        genderStats[p.gender]++;
      } else {
        genderStats.Other++;
      }
    });

    const averageAge = totalCount > 0 ? Math.round((totalAge / totalCount) * 10) / 10 : 0;

    res.json({
      asha_name,
      totalReferrals: totalCount,
      averageAge,
      genderStats,
      patients
    });
  } catch (error) {
    console.error(`Error fetching patients for ASHA ${asha_name}:`, error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Route: Create a new patient referral
app.post('/api/patients', async (req, res) => {
  const { name, age, gender, asha_name, date_referred } = req.body;

  // Validation
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Patient name is required.' });
  }
  if (!age || isNaN(age) || parseInt(age) <= 0) {
    return res.status(400).json({ error: 'A valid patient age is required.' });
  }
  if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
    return res.status(400).json({ error: 'Valid gender selection is required.' });
  }
  if (!asha_name || asha_name.trim() === '') {
    return res.status(400).json({ error: 'Referring ASHA name is required.' });
  }
  if (!date_referred || isNaN(Date.parse(date_referred))) {
    return res.status(400).json({ error: 'A valid reference date is required.' });
  }

  try {
    const insertQuery = `
      INSERT INTO patients (name, age, gender, asha_name, date_referred)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertQuery, [
      name.trim(),
      parseInt(age),
      gender,
      asha_name.trim(),
      date_referred
    ]);

    res.status(201).json({
      message: 'Referral recorded successfully!',
      patientId: result.insertId,
      patient: {
        id: result.insertId,
        name: name.trim(),
        age: parseInt(age),
        gender,
        asha_name: asha_name.trim(),
        date_referred
      }
    });
  } catch (error) {
    console.error('Error creating patient referral:', error);
    res.status(500).json({ error: 'Failed to save patient referral.' });
  }
});

// Start express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
