// const express = require('express');
// const sqlite3 = require('sqlite3').verbose();
// const bodyParser = require('body-parser');
// const path = require('path');


// const app = express();
// const PORT = 3000;


// app.use(bodyParser.json());


// app.use(express.static(path.join(__dirname)));


// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'index.html')); 
// });


// const db = new sqlite3.Database('./graph.db', (err) => {
//     if (err) {
//         console.error('Error connecting to database:', err.message);
//     } else {
//         console.log('Connected to SQLite database.');

        
//         db.run(`CREATE TABLE IF NOT EXISTS graphs (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             nodes TEXT,
//             links TEXT
//         )`, (err) => {
//             if (err) {
//                 console.error('Error creating table:', err.message);
//             } else {
//                 console.log('Table "graphs" is ready.');
//             }
//         });
//     }
// });


// app.get('/api/nodes', (req, res) => {
//     db.all(`SELECT * FROM graphs`, [], (err, rows) => {
//         if (err) {
//             return res.status(500).json({ message: 'Failed to fetch nodes' });
//         }
//         res.json(rows);
//     });
// });


// app.post('/api/save-graph', (req, res) => {
//     const { nodes, links } = req.body;
//     const nodesStr = JSON.stringify(nodes);
//     const linksStr = JSON.stringify(links);

    
//     console.log('Saving Nodes:', nodesStr);
//     console.log('Saving Links:', linksStr);

//     db.run(`INSERT INTO graphs (nodes, links) VALUES (?, ?)`, [nodesStr, linksStr], function(err) {
//         if (err) {
//             console.error('Error saving graph:', err.message);
//             return res.status(400).json({ message: 'Failed to save graph' });
//         }
//         res.status(201).json({ message: 'Graph saved successfully!', id: this.lastID });
//     });
// });


// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });


// process.on('SIGINT', () => {
//     console.log('Closing database connection...');
//     db.close((err) => {
//         if (err) {
//             console.error('Error closing the database:', err.message);
//         }
//         console.log('Database connection closed.');
//         process.exit(0);
//     });
// });




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

// Initialize SQLite database
const db = new sqlite3.Database('./graph.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');

        // Create 'graphs' table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS graphs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nodes TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating graphs table:', err.message);
            } else {
                console.log('Table "graphs" is ready.');
            }
        });

        // Create 'links' table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            graph_id INTEGER,
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) {
                console.error('Error creating links table:', err.message);
            } else {
                console.log('Table "links" is ready.');
            }
        });
    }
});

// Fetch all graphs with their links
app.get('/api/graphs', (req, res) => {
    const query = `
        SELECT graphs.id, graphs.nodes, links.source, links.target
        FROM graphs
        LEFT JOIN links ON graphs.id = links.graph_id
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching graphs:', err.message);
            return res.status(500).json({ message: 'Failed to fetch graphs' });
        }

        // Organize data by graph
        const graphs = {};
        rows.forEach(row => {
            if (!graphs[row.id]) {
                graphs[row.id] = {
                    id: row.id,
                    nodes: JSON.parse(row.nodes),
                    links: []
                };
            }
            if (row.source && row.target) {
                graphs[row.id].links.push([row.source, row.target]);
            }
        });

        // Convert to array
        const graphArray = Object.values(graphs);
        res.json(graphArray);
    });
});

// Save a new graph and its links
app.post('/api/save-graph', (req, res) => {
    const { nodes, links } = req.body;

    if (!nodes || !links) {
        return res.status(400).json({ message: 'Nodes and Links are required' });
    }

    const nodesStr = JSON.stringify(nodes);

    console.log('Saving Nodes:', nodesStr);
    console.log('Saving Links:', JSON.stringify(links));

    // Insert into 'graphs' table
    const insertGraph = `INSERT INTO graphs (nodes) VALUES (?)`;
    db.run(insertGraph, [nodesStr], function(err) {
        if (err) {
            console.error('Error saving graph:', err.message);
            return res.status(500).json({ message: 'Failed to save graph' });
        }

        const graphId = this.lastID;

        // Insert each link into 'links' table
        const insertLink = `INSERT INTO links (graph_id, source, target) VALUES (?, ?, ?)`;
        const stmt = db.prepare(insertLink);

        links.forEach(link => {
            const [source, target] = link;
            stmt.run([graphId, source, target], (err) => {
                if (err) {
                    console.error('Error saving link:', err.message);
                }
            });
        });

        stmt.finalize((err) => {
            if (err) {
                console.error('Error finalizing statement:', err.message);
                return res.status(500).json({ message: 'Failed to save links' });
            }
            res.status(201).json({ message: 'Graph saved successfully!', id: graphId });
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
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
