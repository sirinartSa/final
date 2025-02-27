const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
const hostname = '127.0.0.1';
const port = 3000;

// โหลด SSL Certificate
const certPath = path.join(__dirname, "isrgrootx1.pem");

// เชื่อมต่อฐานข้อมูล TiDB Cloud
const connection = mysql.createConnection({
    host: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
    user: '4J1xAuev9TES1RL.root',
    password: '7I5ifqsmmC2XnAaS',
    database: 'medRights_manage',
    port: 4000,
    ssl: {
        ca: fs.readFileSync(certPath)
    }
});

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
connection.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        return;
    }
    console.log('✅ Connected to database successfully');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.json({
        Name: "Miniproject",
        Author: "Sirinart and Jureerat",
        APIs: [
            { "api_name": "/getUsers/", "method": "get" },
            { "api_name": "/getUser/:id", "method": "get" },
            { "api_name": "/addUser/", "method": "post" },
            { "api_name": "/editUser/", "method": "put" },
            { "api_name": "/deleteUser/", "method": "delete" },
            { "api_name": "/getPatients/", "method": "get" },
            { "api_name": "/getPatient/:id", "method": "get" },
            { "api_name": "/editPatient/", "method": "put" },
            { "api_name": "/deletePatient/:id", "method": "delete" },
            { "api_name": "/getAppointments/", "method": "get" },
            { "api_name": "/api/top-diseases", "method": "get" },
            { "api_name": "/addAppointment/", "method": "post" },
            { "api_name": "/editAppointment/:appointmentId", "method": "put" },
            { "api_name": "/deleteAppointment/:appointmentId", "method": "delete" },
            { "api_name": "/api/patients/today", "method": "get" },
            { "api_name": "/api/patients/search", "method": "get" },
            { "api_name": "/api/patients/status/1", "method": "get" },
            { "api_name": "/api/top-diseases", "method": "get" },
            { "api_name": "/api/patients/age-range", "method": "get" },
            { "api_name": "/api/latest-hn", "method": "get" },
            { "api_name": "/api/patients", "method": "post" },  // Add new patient
            { "api_name": "/api/patients/edit", "method": "put" }, // Edit existing patient
            { "api_name": "/api/patients/status/1", "method": "get" },
            { "api_name": "/api/patients/age-range", "method": "get" },
            { "api_name": "/api/patients/status/1", "method": "get" },
            { "api_name": "/api/top-diseases", "method": "get" }
        ]
    });
});

app.listen(port, hostname, () => {
    console.log(`✅ Server is running at http://${hostname}:${port}/`);
});


// ดึงข้อมูลผู้ใช้ทั้งหมด
app.get('/getUsers', (req, res) => {
    connection.query(
        'SELECT user_id, fullname_user, email, role, status FROM users', 
        (err, results) => {
            if (err) {
                console.error("❌ Database error:", err);
                return res.status(500).json({ error: true, msg: "❌ ไม่สามารถดึงข้อมูลผู้ใช้", details: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: true, msg: "❌ ไม่พบข้อมูลผู้ใช้" });
            }
            res.json({ error: false, data: results });
        }
    );
});

// ดึงข้อมูลผู้ใช้ตาม user_id
app.get('/getUser/:id', (req, res) => {
    const user_id = req.params.id;

    if (!user_id) {
        return res.status(400).json({ error: true, msg: "❌ ต้องระบุ user_id" });
    }

    connection.query(
        'SELECT * FROM users WHERE user_id = ?', 
        [user_id], 
        (err, results) => {
            if (err) {
                console.error("❌ Database error:", err);
                return res.status(500).json({ error: true, msg: "❌ ไม่สามารถดึงข้อมูลผู้ใช้", details: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: true, msg: "❌ ไม่พบผู้ใช้ที่ต้องการ" });
            }
            res.json({ error: false, data: results[0] });
        }
    );
});

app.post("/addUser", (req, res) => {
    const { user_id, fullname_user, email, role, chronic_disease, status, patient_id } = req.body;

    console.log("📥 ข้อมูลที่ได้รับจาก Frontend:", req.body);

    // เช็กว่ามีข้อมูลที่จำเป็นครบหรือไม่
    if (!user_id || !fullname_user || !email || !role) {
        console.error("❌ ข้อมูลไม่ครบ:", req.body);
        return res.status(400).json({ error: true, msg: "❌ กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    try {
        // ตรวจสอบว่าอีเมลนี้มีอยู่แล้วหรือไม่
        const checkEmailQuery = "SELECT email FROM users WHERE email = ?";
        connection.query(checkEmailQuery, [email], (err, results) => {
            if (err) {
                console.error("❌ ตรวจสอบอีเมลล้มเหลว:", err);
                return res.status(500).json({ error: true, msg: "❌ Database error" });
            }
            if (results.length > 0) {
                return res.status(400).json({ error: true, msg: "❌ อีเมลนี้ถูกใช้แล้ว" });
            }

            // ถ้าไม่มี `patient_id` ให้ใช้ค่า `NULL`
            const patient_id_value = patient_id ? patient_id : null;

            // SQL สำหรับเพิ่มข้อมูลผู้ใช้ (ไม่มี created_at และ updated_at)
            const sql = `INSERT INTO users (user_id, fullname_user, email, role, chronic_disease, status, patient_id) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;

            const values = [user_id, fullname_user, email, role, chronic_disease || "", status || "active", patient_id_value];

            connection.query(sql, values, (err, results) => {
                if (err) {
                    console.error("❌ Error inserting user:", err);
                    return res.status(500).json({ error: true, msg: "❌ Cannot Insert", details: err.sqlMessage });
                }
                console.log("✅ เพิ่มผู้ใช้สำเร็จ:", results);
                res.json({ error: false, data: results, msg: "✅ Inserted successfully" });
            });
        });

    } catch (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ error: true, msg: "❌ ระบบเกิดข้อผิดพลาด" });
    }
});



app.put('/editUser/:id', (req, res) => {
    console.log("📥 ข้อมูลที่ได้รับ:", req.body); // ✅ Log เพื่อตรวจสอบค่า body
    
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: true, msg: "❌ ไม่มีข้อมูลที่ส่งมา" });
    }

    const { fullname_user, email, role, chronic_disease, status, patient_id } = req.body;
    const user_id = req.params.id;

    if (!user_id) {
        return res.status(400).json({ error: true, msg: "❌ ต้องระบุ user_id" });
    }

    const sql = 'UPDATE users SET fullname_user = ?, email = ?, role = ?, chronic_disease = ?, status = ?, patient_id = ? WHERE user_id = ?';
    const values = [fullname_user, email, role, chronic_disease, status, patient_id, user_id];

    connection.query(sql, values, (err, results) => {
        if (err) return res.status(500).json({ error: true, msg: "❌ ไม่สามารถอัปเดตข้อมูล" });
        res.json({ error: false, msg: "✅ อัปเดตข้อมูลสำเร็จ" });
    });
});



app.delete('/deleteUser/:id', (req, res) => {
    const userId = req.params.id;
    connection.query('DELETE FROM users WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: true, msg: err.message });
        res.json({ error: false, message: "User deleted successfully" });
    });
});

app.get('/getPatients', (req, res) => {
    connection.query('SELECT patient_id, first_name, last_name FROM patients', (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: true, msg: "Database error", details: err.message });
        }
        res.json({ error: false, data: results });
    });
});

app.get('/getPatient/:id', (req, res) => {
    connection.query('SELECT patient_id, first_name, last_name FROM patients WHERE patient_id = ?', [req.params.id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: true, msg: "Database error", details: err.message });
        }
        res.json({ error: false, data: results.length ? results[0] : null });
    });
});

app.get('/getAppointments', (req, res) => {
    const sql = `
        SELECT 
            a.appointment_id, 
            a.patient_id, 
            p.first_name, 
            p.last_name, 
            a.appointment_date, 
            a.clinic, 
            u.fullname_user AS doctor_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.patient_id
        LEFT JOIN users u ON a.user_id = u.user_id  -- ดึงเฉพาะชื่อแพทย์
        ORDER BY a.appointment_date
    `;

    connection.query(sql, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: true, msg: "Database error", details: err.message });
        }
        res.json({ error: false, data: results });
    });
});



app.post('/addAppointment', (req, res) => {
    let { appointment_id, patient_id, user_id, appointment_datetime, clinic } = req.body;

    // ตรวจสอบค่าที่รับเข้ามา
    if (!patient_id || !user_id || !appointment_datetime || !clinic) {
        return res.status(400).json({ error: true, msg: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ตรวจสอบรูปแบบวันที่-เวลา (ต้องเป็น YYYY-MM-DD HH:mm:ss)
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!dateTimeRegex.test(appointment_datetime)) {
        return res.status(400).json({ error: true, msg: "รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD HH:mm:ss)" });
    }

    // ถ้าไม่มี appointment_id ให้สร้างใหม่
    if (!appointment_id) {
        const randomNum = Math.floor(10 + Math.random() * 90); // สุ่มเลข 10-99
        appointment_id = `APT${randomNum}`;
    }

    console.log("Generated appointment_id:", appointment_id);

    // แปลงวันที่-เวลาให้เป็นโซนเอเชีย (Asia/Bangkok)
    const appointmentDateTimeAsia = moment.tz(appointment_datetime, "Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");

    // คำสั่ง SQL
    const sql = `
        INSERT INTO appointments (appointment_id, patient_id, user_id, appointment_date, clinic) 
        VALUES (?, ?, ?, ?, ?)
    `;

    // ดำเนินการเพิ่มข้อมูล
    connection.query(sql, [appointment_id, patient_id, user_id, appointmentDateTimeAsia, clinic], (err, results) => {
        if (err) {
            console.error("❌ Database Insert Error:", err);
            return res.status(500).json({ 
                error: true, 
                msg: "ไม่สามารถเพิ่มนัดหมายได้", 
                details: err.sqlMessage 
            });
        }
        
        res.json({ error: false, msg: "✅ เพิ่มนัดหมายสำเร็จ!", data: results });
    });
});


app.put('/editAppointment/:appointmentId', (req, res) => {
    const { appointmentId } = req.params; // รับค่า appointmentId จาก URL
    const { appointment_date, clinic } = req.body; // รับค่าจาก body

    // ตรวจสอบว่ามีข้อมูลเพียงพอหรือไม่
    if (!appointmentId) {
        return res.status(400).json({ error: true, msg: "Missing appointment ID" });
    }
    if (!appointment_date || !clinic) {
        return res.status(400).json({ error: true, msg: "Missing required fields" });
    }

    // ตรวจสอบว่า ID เป็น string ตามที่กำหนด (เพราะเป็น VARCHAR(10))
    if (typeof appointmentId !== 'string' || appointmentId.length > 10) {
        return res.status(400).json({ error: true, msg: "Invalid appointment ID format" });
    }

    // อัปเดตข้อมูลในฐานข้อมูล
    connection.query(
        'UPDATE appointments SET appointment_date = ?, clinic = ? WHERE appointment_id = ?',
        [appointment_date, clinic, appointmentId],
        (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ error: true, msg: "Database error", details: err.message });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: true, msg: "Appointment not found or no changes made" });
            }
            res.json({ error: false, msg: "Appointment updated successfully", data: results });
        }
    );
});

app.get('/getAppointment/:id', (req, res) => {
    const appointmentId = req.params.id;
    
    if (!appointmentId) {
        return res.status(400).json({ error: true, msg: "Invalid appointment ID" });
    }

    connection.query('SELECT * FROM appointments WHERE appointment_id = ?', [appointmentId], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: true, msg: "Database error", details: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: true, msg: "Appointment not found" });
        }
        res.json({ error: false, data: results[0] });
    });
});



app.delete('/deleteAppointment/:appointmentId', (req, res) => {
    connection.query('DELETE FROM appointments WHERE appointment_id = ?', [req.params.appointmentId], (err, results) => {
        res.json(err ? { error: "Cannot delete", details: err } : { message: "Appointment deleted", data: results });
    });
});

// Get all patients
app.get('/api/allpatients', (req, res) => {
    connection.query('SELECT COUNT(*) AS totalPatients FROM patients', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ totalPatients: results[0].totalPatients });
    });
});

// Count patients created today
app.get('/api/patients/today', (req, res) => {
    const query = `
        SELECT COUNT(*) AS totalPatientsToday
        FROM patients
        WHERE DATE(created_at) = CURDATE()
    `;

    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ totalPatientsToday: results[0].totalPatientsToday });
    });
});

// Get patient by ID
app.get('/api/patients/search', (req, res) => {
    const query = req.query.query.toUpperCase(); // Convert the query to uppercase

    const sql = `
        SELECT * FROM patients 
        WHERE UPPER(patient_id) LIKE ? 
        OR UPPER(CONCAT(first_name, ' ', last_name)) LIKE ?`;

    // Use wildcards for partial matching
    const values = [`%${query}%`, `%${query}%`];

    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error('Error executing query', error.stack);
            return res.status(500).send('Server error');
        }
        res.json(results); // Send the filtered patients as a response
    });
});

// Count patients with status = 1
app.get('/api/patients/status/1', (req, res) => {
    connection.query('SELECT COUNT(*) AS totalActivePatients FROM patients WHERE status = 1', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ totalActivePatients: results[0].totalActivePatients });
    });
});

// Get top 5 diseases by patient count
app.get('/api/top-diseases', (req, res) => {
    const query = `
        SELECT disease, COUNT(*) AS patient_count 
        FROM patients 
        GROUP BY disease 
        ORDER BY patient_count DESC 
        LIMIT 5;
    `;

    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Count patients by age range
app.get('/api/patients/age-range', (req, res) => {
    const query = `
        SELECT
            CASE
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 0 AND 20 THEN '0-20'
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 21 AND 40 THEN '21-40'
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 41 AND 60 THEN '41-60'
                ELSE '60+'
            END AS age_range,
            COUNT(*) AS patient_count
        FROM patients
        GROUP BY age_range
        ORDER BY FIELD(age_range, '0-20', '21-40', '41-60', '60+')
    `;

    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get the latest patient ID (HN)
app.get('/api/latest-hn', (req, res) => {
    connection.query('SELECT patient_id FROM patients ORDER BY patient_id DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            const latestHN = results[0].patient_id; // Assuming patient_id is your HN
            res.json({ latest_hn: latestHN });
        } else {
            res.json({ latest_hn: 'HN6800001' }); // Default value if no records exist
        }
    });
});

// Add new patient
app.post('/api/patients', (req, res) => {
    const { first_name, last_name, date_of_birth, gender, phone, address, blood_group, allergy, hx_smoking, disease, status } = req.body;

    // Check for missing required fields
    if (!first_name || !last_name || !date_of_birth || !gender || !phone || !address || !blood_group) {
        return res.status(400).json({ message: 'Required fields are missing' });
    }

    const now = new Date();

    // Get the latest patient ID
    connection.query('SELECT patient_id FROM patients ORDER BY patient_id DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        let newPatientId = 'HN6800001';

        if (results.length > 0) {
            const lastId = results[0].patient_id;
            const lastNumber = parseInt(lastId.slice(2), 10);
            newPatientId = `HN${lastNumber + 1}`;
        }

        const patient = {
            patient_id: newPatientId,
            first_name,
            last_name,
            date_of_birth,
            gender,
            phone,
            address,
            blood_group,
            allergy: allergy || null,
            hx_smoking: hx_smoking || 0,
            disease: disease || null,
            status: status || 0,
            created_at: now,
            updated_at: now
        };

        // Insert patient data into the database
        connection.query('INSERT INTO patients SET ?', patient, (err, result) => {
            if (err) {
                console.error('Insert error:', err);
                return res.status(500).json({ error: 'Failed to create patient' });
            }

            res.status(201).json({ 
                message: 'Patient created successfully',
                patient_id: patient.patient_id
            });
        });
    });
});

// Edit patient information
app.put('/api/patients/edit', (req, res) => {
    const { patient_id, first_name, last_name, date_of_birth, blood_group, gender, hx_smoking } = req.body;

    // Validate input
    if (!patient_id || !first_name || !last_name || !date_of_birth || !blood_group || !gender) {
        return res.status(400).json({ message: 'Required fields are missing' });
    }

    // Update patient data in the database
    const query = `
        UPDATE patients 
        SET first_name = ?, last_name = ?, date_of_birth = ?, blood_group = ?, gender = ?, hx_smoking = ? 
        WHERE patient_id = ?
    `;

    connection.query(query, [first_name, last_name, date_of_birth, blood_group, gender, hx_smoking, patient_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ message: 'Patient data updated successfully' });
    });
});
