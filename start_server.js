const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8082;

const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.eot': 'appliaction/vnd.ms-fontobject',
    '.ttf': 'appliaction/font-sfnt'
};

http.createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = parsedUrl.pathname;

    // Prevent directory traversal
    const sanitizePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(__dirname, sanitizePath);

    // If path is a directory, look for index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    const ext = path.parse(filePath).ext;

    fs.readFile(filePath, function (err, data) {
        if (err) {
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
        }
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.end(data);
    });

}).listen(port);

console.log(`Server listening on port ${port}`);
