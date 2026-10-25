const cors = require('cors');

// Read the allowed frontend origins from environment variables.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
.split(',')
.map((origin) => origin.trim())
.filter(Boolean);

const corsOptions = {
origin(origin, callback) {
// Allow requests without an Origin header, such as local scripts.
if (!origin || allowedOrigins.includes(origin)) {
return callback(null, true);
}

```
// Reject requests from origins not present in the allowlist.
return callback(new Error('Origin not allowed by CORS'));
```

},

credentials: true,
};

module.exports = cors(corsOptions);
