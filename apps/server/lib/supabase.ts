import { env } from "@server/env";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = env.SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;

export const supabase = createClient(supabaseUrl, secretKey);
