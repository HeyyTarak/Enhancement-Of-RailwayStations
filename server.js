const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            fullName TEXT NOT NULL,
            aadhaarNumber TEXT NOT NULL,
            dob TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('Users table ready');
                
                // Insert demo user if the table is empty
                db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                    if (err) {
                        console.error('Error checking users count:', err.message);
                    } else if (row.count === 0) {
                        db.run(`INSERT INTO users (email, password, fullName, aadhaarNumber, dob, phone, address) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                                ['user@example.com', 'password123', 'John Doe', '123456789012', '1990-01-01', '9876543210', '123 Main St, City'], 
                                (err) => {
                                    if (err) {
                                        console.error('Error inserting demo user:', err.message);
                                    } else {
                                        console.log('Demo user created');
                                    }
                                });
                    }
                });
            }
        });
    }
});

// Helper function to find user by email
function findUserByEmail(email, callback) {
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, row);
        }
    });
}

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email and password are required' 
        });
    }
    
    findUserByEmail(email, (err, user) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Database error' 
            });
        }
        
        if (!user || user.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        // For security, don't send password back
        const userData = { ...user };
        delete userData.password;
        
        res.json({ 
            success: true, 
            message: 'Login successful', 
            redirect: '/statesearch.html',
            user: userData 
        });
    });
});

// Signup endpoint
app.post('/api/signup', (req, res) => {
    const {
        fullName,
        aadhaarNumber,
        dob,
        email,
        phone,
        address,
        password,
        confirmPassword
    } = req.body;
    
    // Basic validation
    if (!fullName || !aadhaarNumber || !dob || !email || !phone || !address || !password || !confirmPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'All fields are required' 
        });
    }
    
    if (password !== confirmPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'Passwords do not match' 
        });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 8 characters long' 
        });
    }
    
    if (aadhaarNumber.length !== 12 || !/^\d+$/.test(aadhaarNumber)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Aadhaar number must be 12 digits' 
        });
    }
    
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Phone number must be 10 digits' 
        });
    }
    
    // Check if email already exists
    findUserByEmail(email, (err, existingUser) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Database error' 
            });
        }
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }
        
        // Create new user in database
        db.run(`INSERT INTO users (email, password, fullName, aadhaarNumber, dob, phone, address) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [email, password, fullName, aadhaarNumber, dob, phone, address], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error creating user account' 
                        });
                    }
                    
                    // Get the newly created user
                    db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (err, newUser) => {
                        if (err || !newUser) {
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Error retrieving new user' 
                            });
                        }
                        
                        // Don't send password back
                        const userData = { ...newUser };
                        delete userData.password;
                        
                        res.json({ 
                            success: true, 
                            message: 'Registration successful', 
                            redirect: '/loginPage.html',
                            user: userData 
                        });
                    });
                });
    });
});

// Serve all HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Page.html'));
});

app.get('/loginPage.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'loginPage.html'));
});

app.get('/statesearch.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'statesearch.html'));
});

app.get('/bengaluru.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bengaluru.html'));
});

app.get('/hyderabad.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hyderabad.html'));
});

app.get('/secunderabad.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'secunderabad.html'));
});

// Catch-all route for any other HTML files
app.get('/:page', (req, res) => {
    const page = req.params.page;
    if (fs.existsSync(path.join(__dirname, 'public', page))) {
        res.sendFile(path.join(__dirname, 'public', page));
    } else {
        res.status(404).send('Page not found');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Available routes:`);
    console.log(`- Home: http://localhost:${PORT}/`);
    console.log(`- Login: http://localhost:${PORT}/loginPage.html`);
    console.log(`- State Search: http://localhost:${PORT}/statesearch.html`);
    console.log(`- Bengaluru: http://localhost:${PORT}/bengaluru.html`);
    console.log(`- Hyderabad: http://localhost:${PORT}/hyderabad.html`);
    console.log(`- Secunderabad: http://localhost:${PORT}/secunderabad.html`);
});

// Close database connection when server stops
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});