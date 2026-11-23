import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../Backend/server/routers";

export const trpc = createTRPCReact<AppRouter>();
