const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in server environment.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		persistSession: false,
		autoRefreshToken: false
	},
	global: {
		fetch: fetch
	}
});

module.exports = supabase;