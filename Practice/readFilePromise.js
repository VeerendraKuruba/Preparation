// Promise-based implementation (converted from callbacks)

function isFileAvailable(fileName) {
  return Math.random() > 0.9;
}

function readFile(fileName) {
  return new Promise((resolve, reject) => {
    if (!isFileAvailable(fileName)) {
      reject(new Error('File not found'));
      return;
    }
    const fileContent = fileName + ' ' + Math.random();
    resolve(fileContent);
  });
}

// Using .then() / .catch()
readFile('randomfile.txt')
  .then((content) => {
    console.log('File content is: ', content);
  })
  .catch((err) => {
    if (err instanceof Error) {
      console.error('File not found');
    }
  });

// Alternative: using async/await (wrap in async function)
async function main() {
  try {
    const content = await readFile('randomfile.txt');
    console.log('File content is: ', content);
  } catch (err) {
    if (err instanceof Error) {
      console.error('File not found');
    }
  }
}
// main();
