import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_API_BASE_URL: z.url(),
		VITE_WEB_BASE_URL: z.url(),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});
