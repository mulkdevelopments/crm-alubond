import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  // Keep startup log simple for container logs.
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
});
