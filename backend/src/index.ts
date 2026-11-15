import "dotenv/config";
import { createApp } from "./app";
import { jwtSecret } from "./middleware/auth";

jwtSecret();

const port = Number(process.env.PORT ?? 4000);
createApp().listen(port, () => {
  console.log(`Queue API listening on http://localhost:${port}`);
});
