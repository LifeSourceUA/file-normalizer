import Worker from 'worker';

// Parse console args
const task = process.argv[2];
const rootPath = process.argv[3];
const outputFile = process.argv[4] ? process.argv[4] : 'output.txt';

// Check task
const allowedTasks = [
    'print',
    'clean',
    'normalize',
    'rename'
];
if (allowedTasks.indexOf(task) === -1) {
    console.error(`Task "${task}" is not defined`);
    process.exit(1);
}

// Check path
if (!rootPath) {
    console.error('Path is not defined');
    process.exit(1);
}

Worker.run({
    task,
    rootPath,
    outputFile
}).catch((error) => {
    console.error(error);
});
