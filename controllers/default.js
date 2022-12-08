const Pty = require('node-pty');
const fs = require('fs');
const http = require("http");

exports.install = function () {

    ROUTE('/');
    WEBSOCKET('/', socket, ['raw']);

};

async function getClientIp() {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
}

function socket() {

    this.encodedecode = false;
    this.autodestroy();

    this.on('open', async function (client) {

        // Spawn terminal
        client.tty = Pty.spawn('python3', ['run.py', await getClientIp()], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: process.env.PWD,
            env: process.env
        });

        client.tty.on('exit', function (code, signal) {
            client.tty = null;
            client.close();
            console.log("Process killed");
        });

        client.tty.on('data', function (data) {
            client.send(data);
        });

    });

    this.on('close', function (client) {
        if (client.tty) {
            client.tty.kill(9);
            client.tty = null;
            console.log("Process killed and terminal unloaded");
        }
    });

    this.on('message', function (client, msg) {
        client.tty && client.tty.write(msg);
    });
}

if (process.env.CREDS != null) {
    console.log("Creating creds.json file.");
    fs.writeFile('creds.json', process.env.CREDS, 'utf8', function (err) {
        if (err) {
            console.log('Error writing file: ', err);
            socket.emit("console_output", "Error saving credentials: " + err);
        }
    });
}