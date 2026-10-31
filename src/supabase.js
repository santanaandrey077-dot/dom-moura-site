
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmggpaplimebxndhmkeh.supabase.co';

const supabaseKey = 'sb_publishable_BgeLry8R56qlRQxZvIW_Vg_GstpmeTL';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
