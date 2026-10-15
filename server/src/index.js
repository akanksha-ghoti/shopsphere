const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
res.json({
message: 'ShopSphere API is running',
});
});

app.get('/health', (req, res) => {
res.status(200).json({
status: 'OK',
service: 'ShopSphere API',
});
});

app.listen(PORT, () => {
console.log(`ShopSphere server running on port ${PORT}`);
});
