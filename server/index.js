import app from "./app.js";

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`\n  ▸ TonerTrack API rodando em http://${HOST}:${PORT}\n`);
});
