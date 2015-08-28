#!/bin/env node

var exec = require('child_process').exec;
var psTree = require('ps-tree');
var fs = require('fs');
var chokidar = require('chokidar');

var kill = function (pid, signal, callback) {
    var isWin = /^win/.test(process.platform);
    
    if(isWin) {
        exec('taskkill /PID ' + pid + ' /T /F', function (error, stdout, stderr) {
            callback();
        });             
    } else {
        signal   = signal || 'SIGKILL';
        callback = callback || function () {};
        var killTree = true;
        if(killTree) {
            psTree(pid, function (err, children) {
                [pid].concat(
                    children.map(function (p) {
                        return p.PID;
                    })
                ).forEach(function (tpid) {
                    try { process.kill(tpid, signal) }
                    catch (ex) { }
                });
                callback();
            });
        } else {
            try { process.kill(pid, signal) }
            catch (ex) { }
            callback();
        }
    }
};

function run(serverSrcFile) {

    var child = exec('node ' + serverSrcFile);
    child.stdout.on('data', function(data) {
        console.log('stdout: ' + data);
    });
    child.stderr.on('data', function(data) {
        console.log('stderr: ' + data);
    });
    child.on('close', function(code) {
        console.log('closing code: ' + code);
    });

    console.log('server launched');

    return child;

}


if (process.argv[2] === undefined || !fs.statSync(process.argv[2]).isFile()) {
    console.log('Bad or missing argument');
    process.kill(process.pid);
} else {

    var serverFile = process.argv[2],
        childServerProcess;

    chokidar.watch(serverFile, { persistent: true })
        .on('change', function (path) {
            console.log('file changed');

            kill(childServerProcess.pid, null, function () {
                console.log('old server killed');
                childServerProcess = run(serverFile);
            });
        })
        .on('ready', function () {
            childServerProcess = run(serverFile);
        });

}