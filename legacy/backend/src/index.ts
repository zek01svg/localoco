import app from './app.js';

const PORT = process.env.PORT || 3000;
const start = Date.now(); // start timer

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`✅ Ready in ${Date.now() - start} ms`);
  console.log(`🧠 Node.js ${process.version}`);
});