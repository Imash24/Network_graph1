const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');


const app = express();
const PORT = 3000;


app.use(bodyParser.json());


app.use(express.static(path.join(__dirname)));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); 
});


const db = new sqlite3.Database('./graph.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');

        
        db.run(`CREATE TABLE IF NOT EXISTS graphs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nodes TEXT,
            links TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('Table "graphs" is ready.');
            }
        });
    }
});


app.get('/api/nodes', (req, res) => {
    db.all(`SELECT * FROM graphs`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to fetch nodes' });
        }
        res.json(rows);
    });
});


app.post('/api/save-graph', (req, res) => {
    const { nodes, links } = req.body;
    const nodesStr = JSON.stringify(nodes);
    const linksStr = JSON.stringify(links);

    
    console.log('Saving Nodes:', nodesStr);
    console.log('Saving Links:', linksStr);

    db.run(`INSERT INTO graphs (nodes, links) VALUES (?, ?)`, [nodesStr, linksStr], function(err) {
        if (err) {
            console.error('Error saving graph:', err.message);
            return res.status(400).json({ message: 'Failed to save graph' });
        }
        res.status(201).json({ message: 'Graph saved successfully!', id: this.lastID });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


process.on('SIGINT', () => {
    console.log('Closing database connection...');
    db.close((err) => {
        if (err) {
            console.error('Error closing the database:', err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});
