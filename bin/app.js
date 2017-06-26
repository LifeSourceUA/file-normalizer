import Worker from 'worker';

// Parse console args
const task = process.argv[2];
const rootPath = process.argv[3];

// Check task
const allowedTasks = [
    'print',
    'normalize'
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
    rootPath
}).catch((error) => {
    console.error(error);
});
